import { Suspense } from "react";

export default function ProcessingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<p className="p-10 text-slate-400">Loading status…</p>}>{children}</Suspense>;
}
