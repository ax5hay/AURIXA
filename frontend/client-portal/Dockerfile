FROM node:22-slim AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL

# Install pnpm first
RUN npm install -g pnpm@10.28.1

# Copy lockfile and config files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./

# Copy packages and frontend code
COPY packages ./packages
COPY frontend/patient-portal ./frontend/patient-portal

# Install dependencies with retry on network failures
RUN pnpm install --frozen-lockfile || \
    (echo "First install attempt failed, retrying..." && sleep 2 && pnpm install --frozen-lockfile)

# Build the application
RUN pnpm run build --filter=@aurixa/patient-portal

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/frontend/patient-portal ./frontend/patient-portal
ENV NODE_ENV=production
WORKDIR /app/frontend/patient-portal
EXPOSE 3300
CMD ["npx", "next", "start", "--port", "3300", "--hostname", "0.0.0.0"]
