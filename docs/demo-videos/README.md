# AURIXA demo videos

Short (~35–45 second) walkthrough recordings for all three surfaces. Generated with Playwright screen capture against a running local stack.

## Files

| Video | Duration (approx.) | What it shows |
| --- | --- | --- |
| [client-portal-demo.webm](./client-portal-demo.webm) | ~40s | Demo sign-in → home → showings → listings → AI chat (“When is my next showing?”) |
| [agent-workspace-demo.webm](./agent-workspace-demo.webm) | ~38s | Demo agent → Jane Smith client brief → showings → leads pipeline |
| [operator-dashboard-demo.webm](./operator-dashboard-demo.webm) | ~24s | Playground service suite → analytics → organizations → overview |

## Prerequisites

1. Stack running on ports **3300** (client), **3400** (agent), **3100** (dashboard)
2. Demo auth enabled (`CLIENT_DEMO_AUTH_ENABLED`, `STAFF_DEMO_AUTH_ENABLED`)
3. Seeded database (Jane Smith = client #1)

```bash
./scripts/docker-up.sh
# or: pnpm dev (with backends on :3000)
```

## Regenerate

From repo root:

```bash
pnpm demo:videos
```

Or:

```bash
bash scripts/record-demo-videos.sh
```

Videos are written here as `.webm` (1280×720). Open in Chrome, VLC, or QuickTime.

## Customize

Edit flows in `e2e/demo-videos/*.demo.spec.ts` and timing in `e2e/demo-videos/helpers.ts`.
