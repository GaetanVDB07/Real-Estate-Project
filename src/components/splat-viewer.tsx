"use client";

import { useEffect, useRef } from "react";

export function SplatViewer({
  contentUrl,
  settingsUrl,
  posterUrl,
  className,
}: {
  contentUrl?: string | null;
  settingsUrl?: string | null;
  posterUrl?: string | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !contentUrl) return;

    const params = new URLSearchParams();
    params.set("content", window.location.origin + contentUrl);
    if (settingsUrl) {
      params.set("settings", window.location.origin + settingsUrl);
    }
    if (posterUrl) {
      params.set("poster", window.location.origin + posterUrl);
    }

    const iframe = document.createElement("iframe");
    iframe.src = `/viewer/index.html?${params.toString()}`;
    iframe.title = "3D property tour";
    iframe.allow = "fullscreen";
    iframe.className = "h-full w-full border-0";
    iframe.loading = "lazy";

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(iframe);

    return () => {
      containerRef.current?.replaceChildren();
    };
  }, [contentUrl, settingsUrl, posterUrl]);

  if (!contentUrl) {
    return (
      <div
        className={`flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-slate-400 ${className ?? ""}`}
      >
        3D tour will appear here after processing completes.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`aspect-video overflow-hidden rounded-xl border border-slate-800 bg-black ${className ?? ""}`}
    />
  );
}
