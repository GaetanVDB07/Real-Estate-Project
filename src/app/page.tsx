import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { Box } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-800 bg-blue-950/40 px-4 py-1 text-sm text-blue-200">
          <Box className="h-4 w-4" />
          Phone capture to Gaussian splat tours
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
          Immersive 3D property tours for real estate agents
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-400">
          Record a room video on your phone, we rebuild it as a walkable 3D
          Gaussian splat, and you embed it on your property page.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/signup">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary">
              Agent login
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
