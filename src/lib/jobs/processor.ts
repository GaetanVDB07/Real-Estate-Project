import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { listings, processingJobs, rooms } from "@/lib/db/schema";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const PUBLISHED_DIR = path.join(process.cwd(), "public", "published");

const PIPELINE_STEPS: Array<{
  status: (typeof processingJobs.$inferSelect)["status"];
  progress: number;
  delayMs: number;
}> = [
  { status: "extracting_frames", progress: 15, delayMs: 2000 },
  { status: "running_colmap", progress: 35, delayMs: 3000 },
  { status: "training_splat", progress: 70, delayMs: 5000 },
  { status: "exporting", progress: 85, delayMs: 2000 },
  { status: "post_processing", progress: 95, delayMs: 2000 },
  { status: "ready", progress: 100, delayMs: 500 },
];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeDefaultSettings(settingsPath: string, roomName: string) {
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

/**
 * In production, replace this simulated pipeline with the GPU worker
 * (Nerfstudio Splatfacto) described in workers/splat/README.md.
 */
export async function processJob(jobId: string) {
  const [job] = await db
    .select()
    .from(processingJobs)
    .where(eq(processingJobs.id, jobId))
    .limit(1);

  if (!job || job.status === "ready" || job.status === "failed") {
    return;
  }

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
    return;
  }

  const publishDir = path.join(PUBLISHED_DIR, room.listingId, room.id);
  ensureDir(publishDir);

  try {
    for (const step of PIPELINE_STEPS) {
      await db
        .update(processingJobs)
        .set({
          status: step.status,
          progress: step.progress,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(processingJobs.id, jobId));

      await new Promise((resolve) => setTimeout(resolve, step.delayMs));
    }

    const settingsPath = path.join(publishDir, "settings.json");
    writeDefaultSettings(settingsPath, room.name);

    const splatPath = path.join(publishDir, "scene.compressed.ply");
    const posterPath = path.join(publishDir, "poster.svg");

    if (!fs.existsSync(splatPath)) {
      fs.writeFileSync(
        splatPath,
        "# Placeholder — replace with exported Gaussian splat .ply from Splatfacto\n"
      );
    }

    if (!fs.existsSync(posterPath)) {
      fs.writeFileSync(
        posterPath,
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#0f172a"/><text x="400" y="225" fill="#94a3b8" font-family="sans-serif" font-size="24" text-anchor="middle">${room.name} — 3D Tour</text></svg>`
      );
    }

    const publicBase = `/published/${room.listingId}/${room.id}`;

    await db
      .update(processingJobs)
      .set({
        status: "ready",
        progress: 100,
        splatPath: `${publicBase}/scene.compressed.ply`,
        settingsPath: `${publicBase}/settings.json`,
        posterPath: `${publicBase}/poster.svg`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(processingJobs.id, jobId));

    const roomJobs = await db
      .select()
      .from(processingJobs)
      .innerJoin(rooms, eq(processingJobs.roomId, rooms.id))
      .where(eq(rooms.listingId, room.listingId));

    const allReady = roomJobs.every(
      (row) => row.processing_jobs.status === "ready"
    );

    if (allReady) {
      await db
        .update(listings)
        .set({
          status: "ready",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(listings.id, room.listingId));
    } else {
      await db
        .update(listings)
        .set({
          status: "processing",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(listings.id, room.listingId));
    }
  } catch (error) {
    await db
      .update(processingJobs)
      .set({
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "Processing failed",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(processingJobs.id, jobId));
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
