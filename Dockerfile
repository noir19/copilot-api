FROM oven/bun:1.3.12-alpine AS builder
WORKDIR /app

COPY ./package.json ./bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts --network-concurrency=8

COPY . .
RUN bun run build

FROM builder AS production-deps
RUN rm -rf node_modules && bun install --frozen-lockfile --production --ignore-scripts --no-cache --network-concurrency=8

FROM oven/bun:1.3.12-alpine AS runner
WORKDIR /app

COPY ./package.json ./bun.lock ./
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN mkdir -p /root/.local/share/copilot-api
VOLUME ["/root/.local/share/copilot-api"]

EXPOSE 4141

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:4141/ || exit 1

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
