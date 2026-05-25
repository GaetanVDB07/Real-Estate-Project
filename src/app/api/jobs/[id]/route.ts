import { eq } from "drizzle-orm";
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

  const [job] = await db
    .select({
      job: processingJobs,
      room: rooms,
      listing: listings,
    })
    .from(processingJobs)
    .innerJoin(rooms, eq(processingJobs.roomId, rooms.id))
    .innerJoin(listings, eq(rooms.listingId, listings.id))
    .where(eq(processingJobs.id, id))
    .limit(1);

  if (!job || job.listing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ job: job.job });
}
