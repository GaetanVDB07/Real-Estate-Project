import fs from "fs";
import path from "path";
import { commandExists, runCommand } from "@/lib/jobs/run-command";
import { validateExtractedFrames } from "@/lib/jobs/quality-gate";
import type { ProcessingJob, Room } from "@/lib/db/schema";

export type WorkerMode = "simulated" | "gpu" | "auto";

export type JobContext = {
  jobId: string;
  job: ProcessingJob;
  room: Room;
  publishDir: string;
  videoDiskPath: string;
  workDir: string;
  updateStatus: (
    status: ProcessingJob["status"],
    progress: number,
    extra?: Partial<Pick<ProcessingJob, "framesPath" | "errorMessage">>
  ) => Promise<void>;
};

const SIMULATED_STEPS: Array<{
  status: ProcessingJob["status"];
  progress: number;
  delayMs: number;
}> = [
  { status: "extracting_frames", progress: 15, delayMs: 2000 },
  { status: "running_colmap", progress: 35, delayMs: 3000 },
  { status: "training_splat", progress: 70, delayMs: 5000 },
  { status: "exporting", progress: 85, delayMs: 2000 },
  { status: "post_processing", progress: 95, delayMs: 2000 },
];

export function getWorkerMode(): WorkerMode {
  const mode = process.env.SPLAT_WORKER_MODE?.toLowerCase();

  if (mode === "gpu" || mode === "simulated" || mode === "auto") {
    return mode;
  }

  return "simulated";
}

export function writeDefaultSettings(settingsPath: string, roomName: string) {
  const settings = {
    version: 2,
    title: roomName,
    description: "Property tour generated from agent capture",
    camera: {
      initial: {
        position: [0, 1.6, 3],
        target: [0, 1.2, 0],
      },
    },
    controls: {
      orbit: true,
      fly: true,
      walk: false,
    },
  };

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function writePlaceholderPoster(posterPath: string, roomName: string) {
  fs.writeFileSync(
    posterPath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#0f172a"/><text x="400" y="225" fill="#94a3b8" font-family="sans-serif" font-size="24" text-anchor="middle">${roomName} — 3D Tour</text></svg>`
  );
}

function writePlaceholderSplat(splatPath: string) {
  fs.writeFileSync(
    splatPath,
    "# Placeholder — replace with exported Gaussian splat .ply from Splatfacto\n"
  );
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function findExportedPly(searchDir: string): string | null {
  const candidates: Array<{ path: string; size: number }> = [];

  function walk(currentDir: string) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      if (entry.name.endsWith(".ply")) {
        candidates.push({
          path: entryPath,
          size: fs.statSync(entryPath).size,
        });
      }
    }
  }

  if (!fs.existsSync(searchDir)) {
    return null;
  }

  walk(searchDir);

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.size - a.size);
  return candidates[0].path;
}

function findConfigYml(outputsDir: string): string | null {
  if (!fs.existsSync(outputsDir)) {
    return null;
  }

  for (const entry of fs.readdirSync(outputsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const configPath = path.join(outputsDir, entry.name, "config.yml");
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

async function extractFrames(
  videoDiskPath: string,
  framesDir: string,
  fps: number
) {
  ensureDir(framesDir);

  await runCommand(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      videoDiskPath,
      "-vf",
      `fps=${fps}`,
      "-qscale:v",
      "2",
      path.join(framesDir, "%04d.jpg"),
    ],
    { timeoutMs: 10 * 60_000 }
  );
}

async function extractPoster(
  videoDiskPath: string,
  posterPath: string,
  roomName: string
) {
  try {
    await runCommand(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        videoDiskPath,
        "-vf",
        "select=eq(n\\,0)",
        "-q:v",
        "2",
        "-frames:v",
        "1",
        posterPath,
      ],
      { timeoutMs: 30_000 }
    );
  } catch {
    writePlaceholderPoster(
      posterPath.replace(/\.jpg$/i, ".svg"),
      roomName
    );
  }
}

async function runLocalNerfstudioPipeline(
  ctx: JobContext,
  framesDir: string
) {
  const nsDataDir = path.join(ctx.workDir, "ns-data");
  const outputsDir = path.join(ctx.workDir, "outputs");
  const exportsDir = path.join(ctx.workDir, "exports");
  const maxIterations =
    process.env.SPLAT_MAX_ITERATIONS ?? "30000";

  ensureDir(nsDataDir);
  ensureDir(outputsDir);
  ensureDir(exportsDir);

  await ctx.updateStatus("running_colmap", 35);

  await runCommand(
    "ns-process-data",
    ["images", "--data", framesDir, "--output-dir", nsDataDir],
    { timeoutMs: 60 * 60_000 }
  );

  await ctx.updateStatus("training_splat", 55);

  await runCommand(
    "ns-train",
    [
      "splatfacto",
      "--data",
      nsDataDir,
      "--output-dir",
      outputsDir,
      "--max-num-iterations",
      maxIterations,
    ],
    { timeoutMs: 4 * 60 * 60_000 }
  );

  await ctx.updateStatus("exporting", 80);

  const configPath = findConfigYml(path.join(outputsDir, "splatfacto"));
  if (!configPath) {
    throw new Error("Training finished but no splatfacto config was produced.");
  }

  await runCommand(
    "ns-export",
    [
      "gaussian-splat",
      "--load-config",
      configPath,
      "--output-dir",
      exportsDir,
    ],
    { timeoutMs: 30 * 60_000 }
  );

  const exportedPly = findExportedPly(exportsDir);
  if (!exportedPly) {
    throw new Error("Export finished but no .ply file was found.");
  }

  return exportedPly;
}

async function runDockerNerfstudioPipeline(ctx: JobContext) {
  const dockerImage =
    process.env.SPLAT_DOCKER_IMAGE ?? "real-estate-splat-worker";
  const maxIterations =
    process.env.SPLAT_MAX_ITERATIONS ?? "30000";
  const outputDir = path.join(ctx.workDir, "docker-output");

  ensureDir(outputDir);

  await ctx.updateStatus("running_colmap", 35);

  await runCommand(
    "docker",
    [
      "run",
      "--rm",
      "--gpus",
      "all",
      "-v",
      `${path.dirname(ctx.videoDiskPath)}:/input:ro`,
      "-v",
      `${outputDir}:/output`,
      "-e",
      `SPLAT_MAX_ITERATIONS=${maxIterations}`,
      dockerImage,
      `/input/${path.basename(ctx.videoDiskPath)}`,
      "/output",
    ],
    { timeoutMs: 4 * 60 * 60_000 }
  );

  const exportedPly = findExportedPly(outputDir);
  if (!exportedPly) {
    throw new Error("Docker worker finished but no .ply file was found.");
  }

  return exportedPly;
}

export async function gpuToolsAvailable(): Promise<boolean> {
  const hasFfmpeg = await commandExists("ffmpeg");
  if (!hasFfmpeg) {
    return false;
  }

  if (process.env.SPLAT_USE_DOCKER === "true") {
    return commandExists("docker");
  }

  const hasProcessData = await commandExists("ns-process-data");
  const hasTrain = await commandExists("ns-train");
  const hasExport = await commandExists("ns-export");

  return hasProcessData && hasTrain && hasExport;
}

export async function runSimulatedPipeline(ctx: JobContext) {
  const settingsPath = path.join(ctx.publishDir, "settings.json");
  const splatPath = path.join(ctx.publishDir, "scene.compressed.ply");
  const posterPath = path.join(ctx.publishDir, "poster.svg");

  for (const step of SIMULATED_STEPS) {
    await ctx.updateStatus(step.status, step.progress);
    await new Promise((resolve) => setTimeout(resolve, step.delayMs));
  }

  writeDefaultSettings(settingsPath, ctx.room.name);

  if (!fs.existsSync(splatPath)) {
    writePlaceholderSplat(splatPath);
  }

  if (!fs.existsSync(posterPath)) {
    writePlaceholderPoster(posterPath, ctx.room.name);
  }
}

export async function runGpuPipeline(ctx: JobContext) {
  if (!(await commandExists("ffmpeg"))) {
    throw new Error(
      "ffmpeg is not installed. Install ffmpeg or set SPLAT_WORKER_MODE=simulated for local development."
    );
  }

  if (!fs.existsSync(ctx.videoDiskPath)) {
    throw new Error("Uploaded video file was not found on disk.");
  }

  const framesDir = path.join(ctx.workDir, "frames");
  const fps = Number.parseInt(process.env.SPLAT_FRAME_FPS ?? "2", 10);

  await ctx.updateStatus("extracting_frames", 10);
  await extractFrames(ctx.videoDiskPath, framesDir, fps);

  const quality = await validateExtractedFrames(framesDir);
  if (!quality.ok) {
    throw new Error(quality.message);
  }

  await ctx.updateStatus("extracting_frames", 25, {
    framesPath: framesDir,
  });

  let exportedPly: string;

  if (process.env.SPLAT_USE_DOCKER === "true") {
    if (!(await commandExists("docker"))) {
      throw new Error(
        "SPLAT_USE_DOCKER=true but Docker is not available on this machine."
      );
    }

    exportedPly = await runDockerNerfstudioPipeline(ctx);
  } else {
    const hasNerfstudio = await gpuToolsAvailable();
    if (!hasNerfstudio) {
      throw new Error(
        "Nerfstudio CLI not found. Install Nerfstudio, use SPLAT_USE_DOCKER=true, or set SPLAT_WORKER_MODE=simulated."
      );
    }

    exportedPly = await runLocalNerfstudioPipeline(ctx, framesDir);
  }

  await ctx.updateStatus("post_processing", 92);

  const settingsPath = path.join(ctx.publishDir, "settings.json");
  const splatPath = path.join(ctx.publishDir, "scene.compressed.ply");
  const posterPath = path.join(ctx.publishDir, "poster.jpg");

  writeDefaultSettings(settingsPath, ctx.room.name);
  fs.copyFileSync(exportedPly, splatPath);
  await extractPoster(ctx.videoDiskPath, posterPath, ctx.room.name);
}

export function resolvePublicAssetPath(publicPath: string) {
  const normalized = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.join(process.cwd(), "public", normalized);
}
