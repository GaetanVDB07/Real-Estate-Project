#!/usr/bin/env bash
set -euo pipefail

VIDEO_PATH="${1:?video path required}"
OUTPUT_DIR="${2:?output dir required}"
MAX_ITERATIONS="${SPLAT_MAX_ITERATIONS:-30000}"
FRAME_FPS="${SPLAT_FRAME_FPS:-2}"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

FRAMES_DIR="$WORK_DIR/frames"
NS_DATA_DIR="$WORK_DIR/ns-data"
OUTPUTS_DIR="$WORK_DIR/outputs"
EXPORTS_DIR="$WORK_DIR/exports"

mkdir -p "$FRAMES_DIR" "$NS_DATA_DIR" "$OUTPUTS_DIR" "$EXPORTS_DIR" "$OUTPUT_DIR"

echo "Extracting frames at ${FRAME_FPS} fps…"
ffmpeg -hide_banner -loglevel error -y -i "$VIDEO_PATH" \
  -vf "fps=${FRAME_FPS}" -qscale:v 2 "$FRAMES_DIR/%04d.jpg"

FRAME_COUNT="$(find "$FRAMES_DIR" -type f -name '*.jpg' | wc -l | tr -d ' ')"
if [ "$FRAME_COUNT" -lt 40 ]; then
  echo "Quality gate failed: only ${FRAME_COUNT} frames extracted (need 40+)." >&2
  exit 1
fi

echo "Processing dataset (${FRAME_COUNT} frames)…"
ns-process-data images --data "$FRAMES_DIR" --output-dir "$NS_DATA_DIR"

echo "Training splatfacto (max ${MAX_ITERATIONS} iterations)…"
ns-train splatfacto \
  --data "$NS_DATA_DIR" \
  --output-dir "$OUTPUTS_DIR" \
  --max-num-iterations "$MAX_ITERATIONS"

CONFIG_PATH="$(find "$OUTPUTS_DIR/splatfacto" -name config.yml | head -n 1)"
if [ -z "$CONFIG_PATH" ]; then
  echo "Training finished but no config.yml was found." >&2
  exit 1
fi

echo "Exporting Gaussian splat…"
ns-export gaussian-splat \
  --load-config "$CONFIG_PATH" \
  --output-dir "$EXPORTS_DIR"

EXPORTED_PLY="$(find "$EXPORTS_DIR" -type f -name '*.ply' -printf '%s %p\n' | sort -nr | head -n 1 | cut -d' ' -f2-)"
if [ -z "$EXPORTED_PLY" ]; then
  echo "Export finished but no .ply file was found." >&2
  exit 1
fi

cp "$EXPORTED_PLY" "$OUTPUT_DIR/scene.compressed.ply"

if ffmpeg -hide_banner -loglevel error -y -i "$VIDEO_PATH" \
  -vf "select=eq(n\\,0)" -q:v 2 -frames:v 1 "$OUTPUT_DIR/poster.jpg"; then
  echo "Poster saved to $OUTPUT_DIR/poster.jpg"
else
  echo "Poster extraction failed; continuing without poster.jpg"
fi

echo "Export complete: $OUTPUT_DIR/scene.compressed.ply"
