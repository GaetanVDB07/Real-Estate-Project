"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";

export default function SettingsPage() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;
  const [brandColor, setBrandColor] = useState("#1e40af");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [brandColor]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/dashboard/listings/${listingId}`} className="text-sm text-slate-400">
        ← Back to listing
      </Link>
      <Card className="mt-4">
        <h1 className="text-2xl font-semibold text-white">Tour branding</h1>
        <p className="mt-2 text-sm text-slate-400">
          Phase 2: customize embed accent color and agency logo (logo upload coming soon).
        </p>
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="brandColor">Accent color</Label>
            <div className="mt-2 flex items-center gap-3">
              <Input
                id="brandColor"
                type="color"
                value={brandColor}
                onChange={(event) => setBrandColor(event.target.value)}
                className="h-12 w-20 cursor-pointer p-1"
              />
              <span className="text-sm text-slate-400">{brandColor}</span>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => {
              localStorage.setItem(`listing-brand-${listingId}`, brandColor);
              setSaved(true);
            }}
          >
            Save branding
          </Button>
          {saved ? (
            <p className="text-sm text-emerald-300">Branding saved locally for this browser.</p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
