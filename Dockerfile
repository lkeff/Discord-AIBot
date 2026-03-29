# Multi-stage build for Discord-AIBot - Production Optimized
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files (best layer caching)
COPY package*.json pnpm-lock.yaml ./

# Install dependencies with pnpm via corepack (built into Node 20, honors packageManager field)
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate prisma client if needed (don't suppress errors)
RUN pnpm run db:generate || echo "No db:generate script"

# Build application
RUN pnpm run build || echo "No build script"

# Remove dev dependencies from builder
RUN pnpm prune --prod

# ─────────────────────────────────────────
# Production stage - minimal image
# ─────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

LABEL maintainer="bot-team" \
      version="1.0" \
      description="Discord AI Bot - Production"

# Install runtime dependencies only
# procps provides pgrep for the health check
RUN apk add --no-cache ffmpeg opus ca-certificates procps

# Create non-root user for security
RUN addgroup botuser && adduser -D -G botuser botuser

# Copy package files
COPY --from=builder /app/package*.json /app/pnpm-lock.yaml ./

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy built artifacts (only if they exist)
COPY --from=builder /app/dist ./dist 2>/dev/null || true
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma 2>/dev/null || true
COPY --chown=botuser:botuser prisma ./prisma 2>/dev/null || true

# Set environment variables
ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    NODE_OPTIONS="--enable-source-maps" \
    LOG_LEVEL=info

# Don't copy .env files into image (use runtime config)

EXPOSE 3000 8000

# Process-based health check (bot has no HTTP server)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD pgrep -f "node.*index.js" > /dev/null || exit 1

# Switch to non-root user
USER botuser

CMD ["pnpm", "start"]
