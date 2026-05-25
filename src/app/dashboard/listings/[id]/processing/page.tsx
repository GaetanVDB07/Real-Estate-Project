"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { JobStatusPanel } from "@/components/job-status";
import { Button, Card } from "@/components/ui";
import type { ProcessingJob } from "@/lib/db/schema";

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const listingId = params.id;
  const [job, setJob] = useState<ProcessingJob | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let active = true;

    async function poll() {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) return;
      const data = await response.json();
      if (!active) return;
      setJob(data.job);
      if (data.job.status === "ready") {
        router.push(`/dashboard/listings/${listingId}/preview`);
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobId, listingId, router]);

  if (!jobId) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Card>Missing job ID.</Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/dashboard/listings/${listingId}`} className="text-sm text-slate-400">
        ← Back to listing
      </Link>
      <Card className="mt-4">
        <h1 className="text-2xl font-semibold text-white">Processing your capture</h1>
        <p className="mt-2 text-sm text-slate-400">
          We extract frames, estimate camera positions, train the Gaussian splat, and prepare the web viewer.
        </p>
        <div className="mt-6">
          {job ? (
            <JobStatusPanel
              status={job.status}
              progress={job.progress}
              errorMessage={job.errorMessage}
            />
          ) : (
            <p className="text-sm text-slate-400">Loading job status…</p>
          )}
        </div>
        {job?.status === "ready" ? (
          <Button
            className="mt-6"
            onClick={() => router.push(`/dashboard/listings/${listingId}/preview`)}
          >
            Open preview
          </Button>
        ) : null}
      </Card>
    </main>
  );
}
