# Real Estate 3D Tours — App Setup

## Stack

- **Next.js** agent portal + public tour/embed pages
- **SQLite** (local dev) via Drizzle ORM
- **NextAuth** credentials auth for agents
- **SuperSplat Viewer** (`public/viewer/`) for orbit/fly/walk
- **Worker** (`workers/`) for splat processing (`simulated` in dev, `gpu` with Nerfstudio)

## Quick start

```bash
cp .env.example .env.local   # already created if missing
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

1. Sign up as an agent
2. Create a listing
3. Capture or upload a room video
4. Wait for processing (simulated ~15s)
5. Preview tour and copy embed code

Optional background worker (picks up queued jobs):

```bash
npm run worker
```

## Routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Agent listing overview |
| `/dashboard/listings/new` | Create property |
| `/dashboard/listings/[id]/capture` | Record/upload video |
| `/dashboard/listings/[id]/processing` | Job status |
| `/dashboard/listings/[id]/preview` | Preview splat tour |
| `/dashboard/listings/[id]/publish` | Embed snippet |
| `/tour/[id]` | Public tour page |
| `/embed/[id]` | iframe-friendly embed |

## Splat pipeline modes

Set `SPLAT_WORKER_MODE` in `.env.local`:

| Mode | Behavior |
|------|----------|
| `simulated` | Fast fake pipeline for local dev (default) |
| `gpu` | Real ffmpeg + Nerfstudio Splatfacto pipeline |
| `auto` | Uses GPU pipeline when tools are on PATH, otherwise simulated |

GPU mode requires **ffmpeg** and either:

- Nerfstudio CLI (`ns-process-data`, `ns-train`, `ns-export`) on PATH, or
- Docker with `SPLAT_USE_DOCKER=true` and the image from `workers/splat/`

Quality gate (before training): minimum 40 frames, brightness check, and rejection of low-quality captures with actionable retake messages in the dashboard.

Optional tuning: `SPLAT_FRAME_FPS`, `SPLAT_MAX_ITERATIONS`, `SPLAT_DOCKER_IMAGE`.

See [workers/splat/README.md](../workers/splat/README.md) for manual runs and SuperSplat cleanup.

## Branching

Follow [git-workflow.md](./git-workflow.md) for `dev` / `prod` releases.
