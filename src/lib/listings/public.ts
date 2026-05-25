import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { listings, processingJobs, rooms } from "@/lib/db/schema";

export async function getPublicListingTour(listingId: string) {
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!listing) return null;

  const listingRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.listingId, listingId));

  const jobs = await db
    .select()
    .from(processingJobs)
    .innerJoin(rooms, eq(processingJobs.roomId, rooms.id))
    .where(eq(rooms.listingId, listingId));

  return {
    listing,
    rooms: listingRooms,
    jobs: jobs.map((row) => row.processing_jobs),
  };
}
