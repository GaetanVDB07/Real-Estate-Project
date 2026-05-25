import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { listings, processingJobs, rooms } from "@/lib/db/schema";
import { Badge, Button, Card } from "@/components/ui";
import { RoomManager } from "@/components/room-manager";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.userId, session.user.id)))
    .limit(1);

  if (!listing) notFound();

  const listingRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.listingId, id));

  const jobs = await db
    .select()
    .from(processingJobs)
    .innerJoin(rooms, eq(processingJobs.roomId, rooms.id))
    .where(eq(rooms.listingId, id));

  const jobsByRoom = Object.fromEntries(
    jobs.map((row) => [row.processing_jobs.roomId, row.processing_jobs])
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-slate-400">
        ← Back to listings
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">{listing.title}</h1>
          <p className="mt-1 text-slate-400">{listing.address}</p>
        </div>
        <Badge tone={listing.status === "ready" ? "success" : "info"}>
          {listing.status}
        </Badge>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <h2 className="text-lg font-medium text-white">Rooms</h2>
          <RoomManager listingId={id} rooms={listingRooms} jobsByRoom={jobsByRoom} />
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-medium text-white">Publish</h2>
          <p className="text-sm text-slate-400">
            Preview the tour and copy the embed code for your website.
          </p>
          <Link href={`/dashboard/listings/${id}/preview`}>
            <Button className="w-full">Preview tour</Button>
          </Link>
          <Link href={`/dashboard/listings/${id}/publish`}>
            <Button className="w-full" variant="secondary">
              Get embed code
            </Button>
          </Link>
          <Link href={`/dashboard/listings/${id}/settings`}>
            <Button className="w-full" variant="ghost">
              Branding settings
            </Button>
          </Link>
        </Card>
      </div>
    </main>
  );
}
