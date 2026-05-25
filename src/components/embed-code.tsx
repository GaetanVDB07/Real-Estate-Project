"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { absoluteUrl } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

export function EmbedCode({
  listingId,
  title,
}: {
  listingId: string;
  title: string;
}) {
  const [copied, setCopied] = useState<"link" | "iframe" | null>(null);

  const tourUrl = absoluteUrl(`/tour/${listingId}`);
  const embedUrl = absoluteUrl(`/embed/${listingId}`);
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" allowfullscreen title="${title} — 3D tour"></iframe>`;

  async function copy(text: string, kind: "link" | "iframe") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-300">Direct link</h3>
        <div className="flex gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
            {tourUrl}
          </code>
          <Button type="button" variant="secondary" onClick={() => copy(tourUrl, "link")}>
            {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-300">Embed iframe</h3>
        <div className="flex gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
            {iframeCode}
          </code>
          <Button type="button" variant="secondary" onClick={() => copy(iframeCode, "iframe")}>
            {copied === "iframe" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Paste this under the property description on the agent&apos;s website.
        </p>
      </div>
    </div>
  );
}
