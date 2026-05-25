import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, rooms } from "@/lib/db/schema";
import { randomUUID } from "crypto";

const roomSchema = z.object({
  name: z.string().min(2),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: listingId } = await context.params;
  const body = await request.json();
  const parsed = roomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.userId, session.user.id)))
    .limit(1);

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existingRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.listingId, listingId));

  const roomId = randomUUID();
  await db.insert(rooms).values({
    id: roomId,
    listingId,
    name: parsed.data.name,
    sortOrder: existingRooms.length,
    isDefault: existingRooms.length === 0,
  });

  return NextResponse.json({ roomId });
}
