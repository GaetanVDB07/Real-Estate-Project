"use client";

import { useMemo, useState } from "react";
import { SplatViewer } from "@/components/splat-viewer";
import { TourRoomSwitcher } from "@/components/tour-room-switcher";
import type { Listing, ProcessingJob, Room } from "@/lib/db/schema";

export function PublicTour({
  listing,
  rooms,
  jobs,
  compact = false,
}: {
  listing: Listing;
  rooms: Room[];
  jobs: ProcessingJob[];
  compact?: boolean;
}) {
  const defaultRoom = rooms.find((room) => room.isDefault) ?? rooms[0];
  const [activeRoomId, setActiveRoomId] = useState(defaultRoom?.id ?? null);
  const activeJob = useMemo(
    () => jobs.find((job) => job.roomId === activeRoomId),
    [jobs, activeRoomId]
  );

  return (
    <div className={compact ? "bg-black" : "min-h-screen bg-slate-950"}>
      {!compact ? (
        <header className="border-b border-slate-800 px-6 py-4">
          <h1 className="text-xl font-semibold text-white">{listing.title}</h1>
          <p className="text-sm text-slate-400">{listing.address}</p>
        </header>
      ) : null}
      <div className={compact ? "" : "mx-auto max-w-6xl px-6 py-6"}>
        <TourRoomSwitcher
          rooms={rooms}
          activeRoomId={activeRoomId}
          onChange={setActiveRoomId}
        />
        <SplatViewer
          className={compact ? "rounded-none" : undefined}
          contentUrl={activeJob?.splatPath}
          settingsUrl={activeJob?.settingsPath}
          posterUrl={activeJob?.posterPath}
        />
      </div>
    </div>
  );
}
