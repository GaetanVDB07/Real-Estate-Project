import fs from "fs";
import path from "path";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, processingJobs, rooms } from "@/lib/db/schema";
import { getUploadsDir, processJob } from "@/lib/jobs/processor";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const video = formData.get("video");
  const roomId = String(formData.get("roomId") ?? "");

  if (!(video instanceof File) || !roomId) {
    return NextResponse.json({ error: "Video and roomId required" }, { status: 400 });
  }

  const [room] = await db
    .select({
      room: rooms,
      listing: listings,
    })
    .from(rooms)
    .innerJoin(listings, eq(rooms.listingId, listings.id))
    .where(and(eq(rooms.id, roomId), eq(listings.userId, session.user.id)))
    .limit(1);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const uploadsDir = getUploadsDir();
  const listingDir = path.join(uploadsDir, room.room.listingId, room.room.id);
  fs.mkdirSync(listingDir, { recursive: true });

  const extension = path.extname(video.name) || ".webm";
  const filename = `capture-${Date.now()}${extension}`;
  const diskPath = path.join(listingDir, filename);
  const buffer = Buffer.from(await video.arrayBuffer());
  fs.writeFileSync(diskPath, buffer);

  const publicVideoPath = `/uploads/${room.room.listingId}/${room.room.id}/${filename}`;
  const jobId = randomUUID();

  await db.insert(processingJobs).values({
    id: jobId,
    roomId,
    status: "queued",
    progress: 0,
    videoPath: publicVideoPath,
  });

  await db
    .update(listings)
    .set({
      status: "processing",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(listings.id, room.room.listingId));

  void processJob(jobId);

  return NextResponse.json({ jobId, videoPath: publicVideoPath });
}
