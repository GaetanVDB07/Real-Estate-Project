import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, rooms } from "@/lib/db/schema";
import { randomUUID } from "crypto";

const listingSchema = z.object({
  title: z.string().min(2),
  address: z.string().min(3),
  description: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.userId, session.user.id));

  return NextResponse.json({ listings: rows });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const listingId = randomUUID();
  const defaultRoomId = randomUUID();

  await db.insert(listings).values({
    id: listingId,
    userId: session.user.id,
    title: parsed.data.title,
    address: parsed.data.address,
    description: parsed.data.description,
    status: "draft",
  });

  await db.insert(rooms).values({
    id: defaultRoomId,
    listingId,
    name: "Living room",
    sortOrder: 0,
    isDefault: true,
  });

  return NextResponse.json({ listingId, defaultRoomId });
}
