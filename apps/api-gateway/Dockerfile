FROM node:22-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY apps/api-gateway ./apps/api-gateway
COPY packages ./packages
RUN npm install -g pnpm@10.28.1
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=@aurixa/api-gateway

FROM node:22-slim
WORKDIR /app
# Copy full monorepo structure so pnpm node_modules resolution works
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api-gateway ./apps/api-gateway
COPY --from=builder /app/packages ./packages
WORKDIR /app/apps/api-gateway
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
