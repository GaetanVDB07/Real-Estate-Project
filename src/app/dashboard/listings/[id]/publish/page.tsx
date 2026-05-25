"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmbedCode } from "@/components/embed-code";
import { Card } from "@/components/ui";

export default function PublishPage() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;
  const [title, setTitle] = useState("Property tour");

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/listings/${listingId}`);
      if (!response.ok) return;
      const data = await response.json();
      setTitle(data.listing.title);
    }
    load();
  }, [listingId]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/dashboard/listings/${listingId}`} className="text-sm text-slate-400">
        ← Back to listing
      </Link>
      <Card className="mt-4">
        <h1 className="text-2xl font-semibold text-white">Publish tour</h1>
        <p className="mt-2 text-sm text-slate-400">
          Copy the link or iframe embed code for the agent&apos;s property page.
        </p>
        <div className="mt-6">
          <EmbedCode listingId={listingId} title={title} />
        </div>
      </Card>
    </main>
  );
}
