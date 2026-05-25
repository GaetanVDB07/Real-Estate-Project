# GPU Splat Pipeline (Nerfstudio Splatfacto)

Production path for turning agent uploads into `.ply` Gaussian splats.

## Overview

```
video.mp4
  → ffmpeg extract frames (2 fps)
  → quality gate (frame count + brightness)
  → ns-process-data images
  → ns-train splatfacto
  → ns-export gaussian-splat
  → SuperSplat cleanup (manual v1, optional)
  → publish to /public/published/{listingId}/{roomId}/
```

## App integration

The Next.js app creates a `processing_jobs` row on upload. Processing runs via:

- `void processJob(jobId)` on upload (dev), and/or
- `npm run worker` polling for queued jobs

Configure in `.env.local`:

```bash
SPLAT_WORKER_MODE=simulated   # dev default
SPLAT_WORKER_MODE=gpu         # real pipeline (requires tools)
SPLAT_WORKER_MODE=auto        # gpu when ffmpeg + Nerfstudio are on PATH

# Optional
SPLAT_FRAME_FPS=2
SPLAT_MAX_ITERATIONS=30000
SPLAT_USE_DOCKER=true
SPLAT_DOCKER_IMAGE=real-estate-splat-worker
```

Implementation lives in:

- `src/lib/jobs/processor.ts` — job orchestration
- `src/lib/jobs/splat-pipeline.ts` — simulated + GPU paths
- `src/lib/jobs/quality-gate.ts` — pre-training validation

On failure, jobs get `status: failed` with an actionable `errorMessage` (e.g. retake guidance).

## Prerequisites

- NVIDIA GPU with CUDA (for training)
- ffmpeg (frame extraction + quality gate)
- Docker (recommended) or local Python 3.10+ with [Nerfstudio](https://docs.nerf.studio/)

## Manual run (prove pipeline)

Replace paths with your upload and output directories.

```bash
# 1. Extract frames
ffmpeg -i ./uploads/listing/room/video.mp4 -vf fps=2 -qscale:v 2 ./frames/%04d.jpg

# 2. Prepare dataset
ns-process-data images --data ./frames --output-dir ./data/room

# 3. Train Gaussian splat
ns-train splatfacto --data ./data/room --max-num-iterations 30000

# 4. Export for web viewer
ns-export gaussian-splat \
  --load-config outputs/room/splatfacto/*/config.yml \
  --output-dir ./exports/room
```

## Post-process (optional v1)

1. Open exported `.ply` in [SuperSplat](https://superspl.at)
2. Crop floaters, compress, set camera spawn
3. Export `scene.compressed.ply` + `settings.json`
4. Copy to `public/published/{listingId}/{roomId}/`

The automated worker publishes the exported `.ply` directly; SuperSplat cleanup improves quality.

## Docker

```bash
docker build -t real-estate-splat-worker ./workers/splat
docker run --gpus all \
  -v /path/to/video-dir:/input:ro \
  -v /path/to/output:/output \
  real-estate-splat-worker /input/video.mp4 /output
```

Then set `SPLAT_USE_DOCKER=true` and `SPLAT_WORKER_MODE=gpu` in the app environment.

## Quality gate

Before training, the worker validates:

- At least 40 extracted frames (~20s at 2 fps)
- Most frames are non-empty captures
- Sampled brightness is not too dark or overexposed

Failed captures surface retake instructions in the agent dashboard.
