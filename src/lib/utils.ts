import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  extracting_frames: "Extracting frames",
  running_colmap: "Estimating camera positions",
  training_splat: "Training 3D Gaussian splat",
  exporting: "Exporting splat file",
  post_processing: "Post-processing",
  ready: "Ready",
  failed: "Failed",
};

export const CAPTURE_TIPS = [
  "Record 15–30 seconds per room with a slow, steady pan.",
  "Overlap each frame with the previous view — move slowly.",
  "Capture walls, floor, and ceiling corners when possible.",
  "Avoid fast movement, motion blur, and dark rooms.",
  "For large rooms, do a second pass at a different height.",
];
