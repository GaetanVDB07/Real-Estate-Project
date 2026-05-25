"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SplatViewer } from "@/components/splat-viewer";
import { TourRoomSwitcher } from "@/components/tour-room-switcher";
import { Button, Card } from "@/components/ui";
import type { Listing, ProcessingJob, Room } from "@/lib/db/schema";

export default function PreviewPage() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;
  const [listing, setListing] = useState<Listing | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/listings/${listingId}`);
      if (!response.ok) return;
      const data = await response.json();
      setListing(data.listing);
      setRooms(data.rooms);
      setJobs(data.jobs);
      const defaultRoom =
        data.rooms.find((room: Room) => room.isDefault) ?? data.rooms[0];
      setActiveRoomId(defaultRoom?.id ?? null);
    }
    load();
  }, [listingId]);

  const activeJob = jobs.find((job) => job.roomId === activeRoomId);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href={`/dashboard/listings/${listingId}`} className="text-sm text-slate-400">
        ← Back to listing
      </Link>
      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Tour preview</h1>
            <p className="text-sm text-slate-400">{listing?.title}</p>
          </div>
          <Link href={`/dashboard/listings/${listingId}/publish`}>
            <Button>Publish embed</Button>
          </Link>
        </div>

        <TourRoomSwitcher
          rooms={rooms}
          activeRoomId={activeRoomId}
          onChange={setActiveRoomId}
        />

        <div className="mt-6">
          <SplatViewer
            contentUrl={activeJob?.splatPath}
            settingsUrl={activeJob?.settingsPath}
            posterUrl={activeJob?.posterPath}
          />
        </div>
      </Card>
    </main>
  );
}
