# Multi-stage build for Discord-AIBot - Production Optimized
FROM node:20.18-alpine3.20 AS builder

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

# Generate prisma client if present (script must exist for this to run)
RUN if pnpm run --if-present db:generate; then echo "db:generate completed"; fi

# Build application if script exists
RUN if pnpm run --if-present build; then echo "build completed"; fi

# Remove dev dependencies from builder
RUN pnpm prune --prod

# ─────────────────────────────────────────
# Production stage - minimal image
# ─────────────────────────────────────────
FROM node:20.18-alpine3.20

WORKDIR /app

LABEL maintainer="bot-team" \
      version="1.0" \
      description="Discord AI Bot - Production"

# Install runtime dependencies only
RUN apk add --no-cache ffmpeg opus ca-certificates

# Create non-root user for security
RUN addgroup botuser && adduser -D -G botuser botuser

# Copy package files
COPY --from=builder /app/package*.json /app/pnpm-lock.yaml ./

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy built artifacts if they exist (use conditional copy via shell)
RUN mkdir -p /app/dist
COPY --from=builder /app/dist /app/dist

# Copy prisma files if present
COPY --chown=botuser:botuser --from=builder /app/node_modules/.prisma /app/node_modules/.prisma

# Set environment variables
ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    NODE_OPTIONS="--enable-source-maps" \
    LOG_LEVEL=info

# Don't copy .env files into image (use runtime config)

EXPOSE 3000 8000

# Improved health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Switch to non-root user
USER botuser

CMD ["pnpm", "start"]
