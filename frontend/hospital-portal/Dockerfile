FROM node:22-slim AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY frontend/hospital-portal ./frontend/hospital-portal
RUN npm install -g pnpm@10.28.1
RUN pnpm install --frozen-lockfile
RUN pnpm run build --filter=@aurixa/hospital-portal

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/frontend/hospital-portal ./frontend/hospital-portal
ENV NODE_ENV=production
WORKDIR /app/frontend/hospital-portal
EXPOSE 3400
CMD ["npx", "next", "start", "--port", "3400", "--hostname", "0.0.0.0"]
