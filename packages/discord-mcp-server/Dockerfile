# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

COPY package.json ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build && pnpm prune --prod

# ---- runtime stage -------------------------------------------------------
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache ca-certificates \
    && addgroup -S botuser \
    && adduser -S -G botuser botuser

COPY --from=builder --chown=botuser:botuser /app/package.json ./
COPY --from=builder --chown=botuser:botuser /app/node_modules ./node_modules
COPY --from=builder --chown=botuser:botuser /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e \
    "require('http').get('http://localhost:4000/health',(r)=>{if(r.statusCode!==200)throw new Error(r.statusCode)})" \
    || exit 1

USER botuser
CMD ["node", "dist/index.js"]
