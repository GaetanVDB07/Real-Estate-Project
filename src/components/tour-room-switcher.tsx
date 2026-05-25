"use client";

import type { Room } from "@/lib/db/schema";
import { Button } from "@/components/ui";

export function TourRoomSwitcher({
  rooms,
  activeRoomId,
  onChange,
}: {
  rooms: Room[];
  activeRoomId: string | null;
  onChange: (roomId: string) => void;
}) {
  if (rooms.length <= 1) return null;

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {rooms.map((room) => (
        <Button
          key={room.id}
          type="button"
          size="sm"
          variant={room.id === activeRoomId ? "primary" : "secondary"}
          onClick={() => onChange(room.id)}
        >
          {room.name}
        </Button>
      ))}
    </div>
  );
}
