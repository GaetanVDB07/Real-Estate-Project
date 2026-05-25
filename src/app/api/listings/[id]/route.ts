import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, processingJobs, rooms } from "@/lib/db/schema";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.userId, session.user.id)))
    .limit(1);

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const listingRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.listingId, id));

  const jobs = await db
    .select()
    .from(processingJobs)
    .innerJoin(rooms, eq(processingJobs.roomId, rooms.id))
    .where(eq(rooms.listingId, id));

  return NextResponse.json({
    listing,
    rooms: listingRooms,
    jobs: jobs.map((row) => row.processing_jobs),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.userId, session.user.id)))
    .limit(1);

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .update(listings)
    .set({
      status: body.status ?? listing.status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(listings.id, id));

  return NextResponse.json({ ok: true });
}
