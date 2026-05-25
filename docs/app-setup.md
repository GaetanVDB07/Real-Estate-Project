# Real Estate 3D Tours — App Setup

## Stack

- **Next.js** agent portal + public tour/embed pages
- **SQLite** (local dev) via Drizzle ORM
- **NextAuth** credentials auth for agents
- **SuperSplat Viewer** (`public/viewer/`) for orbit/fly/walk
- **Worker** (`workers/`) for splat processing (simulated in dev)

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

## Production splat pipeline

See [workers/splat/README.md](../workers/splat/README.md) for Nerfstudio Splatfacto + SuperSplat steps.

## Branching

Follow [git-workflow.md](./git-workflow.md) for `dev` / `prod` releases.
