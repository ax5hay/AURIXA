FROM node:22-slim AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api-gateway ./apps/api-gateway
COPY packages ./packages
RUN npm install -g pnpm@10.28.1
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=@aurixa/api-gateway

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/apps/api-gateway/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
