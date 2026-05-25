"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import type { ProcessingJob, Room } from "@/lib/db/schema";

export function RoomManager({
  listingId,
  rooms,
  jobsByRoom,
}: {
  listingId: string;
  rooms: Room[];
  jobsByRoom: Record<string, ProcessingJob>;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function addRoom() {
    if (!name.trim()) return;
    setLoading(true);
    await fetch(`/api/listings/${listingId}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-4">
      {rooms.length === 0 ? (
        <p className="text-sm text-slate-400">No rooms yet.</p>
      ) : (
        <ul className="space-y-3">
          {rooms.map((room) => {
            const job = jobsByRoom[room.id];
            return (
              <li
                key={room.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4"
              >
                <div>
                  <p className="font-medium text-white">{room.name}</p>
                  <p className="text-xs text-slate-500">
                    {job ? `Status: ${job.status} (${job.progress}%)` : "Not captured yet"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/listings/${listingId}/capture?roomId=${room.id}`}>
                    <Button size="sm" variant="secondary">
                      {job ? "Retake" : "Capture"}
                    </Button>
                  </Link>
                  {job ? (
                    <Link
                      href={`/dashboard/listings/${listingId}/processing?jobId=${job.id}`}
                    >
                      <Button size="sm">Status</Button>
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2 border-t border-slate-800 pt-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Add room (Kitchen, Garden…)"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        />
        <Button type="button" onClick={addRoom} disabled={loading}>
          Add room
        </Button>
      </div>
    </div>
  );
}
