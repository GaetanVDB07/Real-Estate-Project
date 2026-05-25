import fs from "fs";
import path from "path";
import { runCommand } from "@/lib/jobs/run-command";

const FRAME_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MIN_FRAMES = 40;
const MIN_FRAME_BYTES = 10_000;
const MIN_VALID_FRAME_RATIO = 0.8;
const MIN_BRIGHTNESS = 16;
const MAX_BRIGHTNESS = 235;

export type QualityGateResult =
  | { ok: true; frameCount: number }
  | { ok: false; message: string };

function listFrameFiles(framesDir: string): string[] {
  return fs
    .readdirSync(framesDir)
    .filter((file) => FRAME_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => path.join(framesDir, file))
    .sort();
}

async function sampleBrightness(framePath: string): Promise<number | null> {
  try {
    const { stderr } = await runCommand(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "info",
        "-i",
        framePath,
        "-vf",
        "signalstats",
        "-frames:v",
        "1",
        "-f",
        "null",
        "-",
      ],
      { timeoutMs: 15_000 }
    );

    const match = stderr.match(/YAVG:([\d.]+)/) ?? stderr.match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
    return match ? Number.parseFloat(match[1]) : null;
  } catch {
    return null;
  }
}

export async function validateExtractedFrames(
  framesDir: string
): Promise<QualityGateResult> {
  const frames = listFrameFiles(framesDir);

  if (frames.length < MIN_FRAMES) {
    return {
      ok: false,
      message:
        "Not enough frames — walk slowly and pan across the room for at least 20 seconds.",
    };
  }

  const validFrames = frames.filter(
    (framePath) => fs.statSync(framePath).size >= MIN_FRAME_BYTES
  );

  if (validFrames.length / frames.length < MIN_VALID_FRAME_RATIO) {
    return {
      ok: false,
      message:
        "Capture quality too low — hold the phone steady and avoid fast movement.",
    };
  }

  const sampleCount = Math.min(5, validFrames.length);
  const step = Math.max(1, Math.floor(validFrames.length / sampleCount));
  const brightnessSamples: number[] = [];

  for (let index = 0; index < validFrames.length; index += step) {
    const brightness = await sampleBrightness(validFrames[index]);
    if (brightness !== null) {
      brightnessSamples.push(brightness);
    }
    if (brightnessSamples.length >= sampleCount) {
      break;
    }
  }

  if (brightnessSamples.length > 0) {
    const average =
      brightnessSamples.reduce((sum, value) => sum + value, 0) /
      brightnessSamples.length;

    if (average < MIN_BRIGHTNESS) {
      return {
        ok: false,
        message:
          "Video is too dark — record with more light or open blinds before retaking.",
      };
    }

    if (average > MAX_BRIGHTNESS) {
      return {
        ok: false,
        message:
          "Video is overexposed — avoid pointing at windows and retake with even lighting.",
      };
    }
  }

  return { ok: true, frameCount: frames.length };
}
