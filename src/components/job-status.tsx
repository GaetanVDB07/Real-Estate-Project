"use client";

import { JOB_STATUS_LABELS } from "@/lib/utils";
import { Badge } from "@/components/ui";

export function JobStatusPanel({
  status,
  progress,
  errorMessage,
}: {
  status: string;
  progress: number;
  errorMessage?: string | null;
}) {
  const tone =
    status === "ready"
      ? "success"
      : status === "failed"
        ? "error"
        : status === "queued"
          ? "default"
          : "info";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Processing status</h3>
        <Badge tone={tone}>{JOB_STATUS_LABELS[status] ?? status}</Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-slate-400">{progress}% complete</p>
      {errorMessage ? (
        <p className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
