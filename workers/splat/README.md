# GPU Splat Pipeline (Nerfstudio Splatfacto)

Production path for turning agent uploads into `.ply` Gaussian splats.

## Overview

```
video.mp4
  → ffmpeg extract frames (2 fps)
  → ns-process-data video
  → ns-train splatfacto
  → ns-export gaussian-splat
  → SuperSplat cleanup (manual v1)
  → publish to /public/published/{listingId}/{roomId}/
```

## Prerequisites

- NVIDIA GPU with CUDA
- Docker (recommended) or local Python 3.10+
- [Nerfstudio](https://docs.nerf.studio/) installed
- ffmpeg

## Commands (manual run)

Replace paths with your upload and output directories.

```bash
# 1. Extract / prepare dataset
ns-process-data video --data ./uploads/listing/room/video.mp4 --output-dir ./data/room

# 2. Train Gaussian splat
ns-train splatfacto --data ./data/room --max-num-iterations 30000

# 3. Export for web viewer
ns-export gaussian-splat \
  --load-config outputs/room/splatfacto/*/config.yml \
  --output-dir ./exports/room
```

## Post-process

1. Open exported `.ply` in [SuperSplat](https://superspl.at)
2. Crop floaters, compress, set camera spawn
3. Export `scene.compressed.ply` + `settings.json`
4. Copy to `public/published/{listingId}/{roomId}/`

## Docker (skeleton)

```bash
docker build -t real-estate-splat-worker ./workers/splat
docker run --gpus all -v ./uploads:/uploads -v ./exports:/exports real-estate-splat-worker
```

## App integration

- Upload API saves video to `public/uploads/…`
- Job row created with `status=queued`
- Run `npm run worker` (simulated pipeline in dev) or GPU worker in production
- On completion, job stores public URLs for splat, settings, poster

Set `SPLAT_WORKER_MODE=gpu` when wiring the real worker (future hook in `src/lib/jobs/processor.ts`).
