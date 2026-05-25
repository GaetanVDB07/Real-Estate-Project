import Link from "next/link";
import { eq } from "drizzle-orm";
import { Plus, LogOut } from "lucide-react";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { Badge, Button, Card } from "@/components/ui";
import { signOut } from "@/lib/auth";

function statusTone(status: string) {
  switch (status) {
    case "ready":
    case "published":
      return "success" as const;
    case "processing":
      return "info" as const;
    case "draft":
      return "warning" as const;
    default:
      return "default" as const;
  }
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.userId, session.user.id));

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-slate-400">Agent portal</p>
            <h1 className="text-xl font-semibold text-white">
              Welcome, {session.user.name}
            </h1>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="secondary">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">My listings</h2>
            <p className="text-sm text-slate-400">
              Create a property, capture rooms, and publish 3D tours.
            </p>
          </div>
          <Link href="/dashboard/listings/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New listing
            </Button>
          </Link>
        </div>

        {rows.length === 0 ? (
          <Card>
            <p className="text-slate-300">No listings yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Start by creating your first property and capturing a room video.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((listing) => (
              <Link key={listing.id} href={`/dashboard/listings/${listing.id}`}>
                <Card className="transition hover:border-blue-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        {listing.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {listing.address}
                      </p>
                    </div>
                    <Badge tone={statusTone(listing.status)}>
                      {listing.status}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
