import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/app");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <div className="mb-6 inline-block rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Keyboard-first project management
        </div>
        <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-6xl">
          Project management without the bloat.
        </h1>
        <p className="mt-6 text-balance text-lg text-muted-foreground">
          Prism is sub-100ms fast, command-driven, and radically simple. Move
          tasks, switch teams, file work — without ever taking your hands off
          the keyboard.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          Press <kbd className="rounded border bg-muted px-1.5 py-0.5">⌘</kbd>{" "}
          <kbd className="rounded border bg-muted px-1.5 py-0.5">K</kbd>{" "}
          anywhere inside the app.
        </p>
      </div>
    </main>
  );
}
