import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadSidebarData } from "@/lib/sidebar-data";

export default async function AppDashboardPage() {
  const { orgs, activeOrgId } = await loadSidebarData();
  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null;

  if (!activeOrg) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <Sparkles className="h-10 w-10 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Welcome to Prism</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            You&rsquo;re not in any organizations yet. Create one to start
            grouping departments, teams, and projects.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/onboarding">
            <Plus className="mr-2 h-4 w-4" />
            Create your organization
          </Link>
        </Button>
      </div>
    );
  }

  const teamCount =
    activeOrg.departments.reduce((acc, d) => acc + d.teams.length, 0) +
    activeOrg.unassignedTeams.length;
  const projectCount =
    activeOrg.departments.reduce(
      (acc, d) => acc + d.teams.reduce((a, t) => a + t.projects.length, 0),
      0
    ) +
    activeOrg.unassignedTeams.reduce((acc, t) => acc + t.projects.length, 0);

  return (
    <div className="space-y-8 px-8 py-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {activeOrg.name}
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Departments" value={activeOrg.departments.length} />
        <Stat label="Teams" value={teamCount} />
        <Stat label="Active projects" value={projectCount} />
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Quick start</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You haven&rsquo;t opened anything yet. Try the command palette.
            </p>
          </div>
          <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs">
            ⌘K
          </kbd>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
