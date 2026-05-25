import fs from "fs";
import path from "path";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { listings, processingJobs, rooms } from "@/lib/db/schema";
import {
  getWorkerMode,
  gpuToolsAvailable,
  resolvePublicAssetPath,
  runGpuPipeline,
  runSimulatedPipeline,
  type JobContext,
} from "@/lib/jobs/splat-pipeline";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const PUBLISHED_DIR = path.join(process.cwd(), "public", "published");
const JOBS_DIR = path.join(process.cwd(), "data", "jobs");

const activeJobs = new Set<string>();

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function markListingStatus(listingId: string) {
  const roomJobs = await db
    .select()
    .from(processingJobs)
    .innerJoin(rooms, eq(processingJobs.roomId, rooms.id))
    .where(eq(rooms.listingId, listingId));

  const allReady = roomJobs.every(
    (row) => row.processing_jobs.status === "ready"
  );

  await db
    .update(listings)
    .set({
      status: allReady ? "ready" : "processing",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(listings.id, listingId));
}

async function failJob(jobId: string, listingId: string, message: string) {
  await db
    .update(processingJobs)
    .set({
      status: "failed",
      errorMessage: message,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(processingJobs.id, jobId));

  await markListingStatus(listingId);
}

export async function processJob(jobId: string) {
  if (activeJobs.has(jobId)) {
    return;
  }

  const [job] = await db
    .select()
    .from(processingJobs)
    .where(eq(processingJobs.id, jobId))
    .limit(1);

  if (!job || job.status === "ready" || job.status === "failed") {
    return;
  }

  if (job.status !== "queued") {
    return;
  }

  const claimed = await db
    .update(processingJobs)
    .set({
      status: "extracting_frames",
      progress: 1,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(processingJobs.id, jobId),
        eq(processingJobs.status, "queued")
      )
    )
    .returning();

  if (claimed.length === 0) {
    return;
  }

  activeJobs.add(jobId);

  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, job.roomId))
    .limit(1);

  if (!room) {
    await db
      .update(processingJobs)
      .set({
        status: "failed",
        errorMessage: "Room not found",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(processingJobs.id, jobId));
    activeJobs.delete(jobId);
    return;
  }

  const publishDir = path.join(PUBLISHED_DIR, room.listingId, room.id);
  const workDir = path.join(JOBS_DIR, jobId);
  ensureDir(publishDir);
  ensureDir(workDir);

  const videoDiskPath = job.videoPath
    ? resolvePublicAssetPath(job.videoPath)
    : "";

  const updateStatus: JobContext["updateStatus"] = async (
    status,
    progress,
    extra
  ) => {
    await db
      .update(processingJobs)
      .set({
        status,
        progress,
        ...extra,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(processingJobs.id, jobId));
  };

  const ctx: JobContext = {
    jobId,
    job,
    room,
    publishDir,
    videoDiskPath,
    workDir,
    updateStatus,
  };

  try {
    const mode = getWorkerMode();
    let pipelineMode: "simulated" | "gpu" = "simulated";

    if (mode === "gpu") {
      pipelineMode = "gpu";
    } else if (mode === "auto" && (await gpuToolsAvailable())) {
      pipelineMode = "gpu";
    }

    if (pipelineMode === "gpu") {
      await runGpuPipeline(ctx);
    } else {
      await runSimulatedPipeline(ctx);
    }

    const publicBase = `/published/${room.listingId}/${room.id}`;
    const posterFilename = fs.existsSync(path.join(publishDir, "poster.jpg"))
      ? "poster.jpg"
      : "poster.svg";

    await db
      .update(processingJobs)
      .set({
        status: "ready",
        progress: 100,
        splatPath: `${publicBase}/scene.compressed.ply`,
        settingsPath: `${publicBase}/settings.json`,
        posterPath: `${publicBase}/${posterFilename}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(processingJobs.id, jobId));

    await markListingStatus(room.listingId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Processing failed";

    await failJob(jobId, room.listingId, message);
  } finally {
    activeJobs.delete(jobId);
  }
}

export function getUploadsDir() {
  ensureDir(UPLOADS_DIR);
  return UPLOADS_DIR;
}

export function getPublishedDir() {
  ensureDir(PUBLISHED_DIR);
  return PUBLISHED_DIR;
}
