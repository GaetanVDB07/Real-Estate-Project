#!/usr/bin/env bash
set -euo pipefail

VIDEO_PATH="${1:?video path required}"
OUTPUT_DIR="${2:?output dir required}"

mkdir -p "$OUTPUT_DIR/data" "$OUTPUT_DIR/exports"

ns-process-data video --data "$VIDEO_PATH" --output-dir "$OUTPUT_DIR/data"
ns-train splatfacto --data "$OUTPUT_DIR/data" --output-dir "$OUTPUT_DIR/outputs"
ns-export gaussian-splat --load-config "$OUTPUT_DIR/outputs/splatfacto"/*/config.yml --output-dir "$OUTPUT_DIR/exports"

echo "Export complete: $OUTPUT_DIR/exports"
