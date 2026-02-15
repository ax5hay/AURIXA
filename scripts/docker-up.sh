#!/usr/bin/env bash
# Run the full AURIXA SaaS stack via Docker.
# Usage: ./scripts/docker-up.sh [--build]
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUILD_FLAG=""
if [[ "${1:-}" == "--build" ]]; then
  BUILD_FLAG="--build"
fi

echo "=== AURIXA Docker Stack ==="

# Ensure we're in infra/docker for compose file
cd infra/docker

# Start infrastructure first
echo "Starting Postgres and Redis..."
docker compose up -d postgres redis

# Wait for Postgres to be ready
echo "Waiting for Postgres..."
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if docker compose exec -T postgres pg_isready -U aurixa 2>/dev/null; then
    break
  fi
  sleep 2
done

# Run database seed (idempotent - wipes and re-seeds)
echo "Seeding database..."
docker compose run --rm db-seed 2>/dev/null || true

# Start all services
echo "Starting all services..."
docker compose up -d $BUILD_FLAG

echo ""
echo "Stack is up. Endpoints:"
echo "  Gateway:       http://localhost:3000"
echo "  Dashboard:     http://localhost:3100"
echo "  Patient:       http://localhost:3300"
echo "  Hospital:      http://localhost:3400"
echo ""
echo "Run 'docker compose -f infra/docker/docker-compose.yml logs -f' to follow logs."
