import { Suspense } from "react";

export default function CaptureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<p className="p-10 text-slate-400">Loading capture…</p>}>{children}</Suspense>;
}
