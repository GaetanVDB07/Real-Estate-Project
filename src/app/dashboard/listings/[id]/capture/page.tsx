"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { VideoCapture } from "@/components/video-capture";
import { Card } from "@/components/ui";

export default function CapturePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");
  const listingId = params.id;

  if (!roomId) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Card>
          <p className="text-slate-300">Missing room. Go back to the listing and choose a room.</p>
          <Link href={`/dashboard/listings/${listingId}`} className="mt-4 inline-block text-blue-400">
            Back to listing
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/dashboard/listings/${listingId}`} className="text-sm text-slate-400">
        ← Back to listing
      </Link>
      <Card className="mt-4">
        <h1 className="text-2xl font-semibold text-white">Capture room video</h1>
        <p className="mt-2 text-sm text-slate-400">
          Record a slow 15–30 second sweep or upload a video file.
        </p>
        <div className="mt-6">
          <VideoCapture
            roomId={roomId}
            onUploaded={(jobId) => {
              router.push(
                `/dashboard/listings/${listingId}/processing?jobId=${jobId}`
              );
            }}
          />
        </div>
      </Card>
    </main>
  );
}
