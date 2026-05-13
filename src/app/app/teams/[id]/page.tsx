import Link from "next/link";
import { notFound } from "next/navigation";
import { Folder, Globe, Lock, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

const VISIBILITY_ICON = {
  private: Lock,
  department: Users,
  org: Globe,
} as const;

interface TeamMemberRow {
  user_id: string;
  role: "lead" | "member";
  joined_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  visibility: "private" | "department" | "org";
  archived_at: string | null;
}

export default async function TeamPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, organization_id, department_id, departments(name)")
    .eq("id", params.id)
    .maybeSingle();

  if (!team) notFound();

  const [{ data: rawMembers }, { data: rawProjects }] = await Promise.all([
    supabase
      .from("team_members")
      .select("user_id, role, joined_at")
      .eq("team_id", params.id),
    supabase
      .from("projects")
      .select("id, name, visibility, archived_at")
      .eq("team_id", params.id),
  ]);

  const members = (rawMembers ?? []) as TeamMemberRow[];
  const projects = ((rawProjects ?? []) as ProjectRow[]).filter(
    (p) => !p.archived_at
  );

  const memberIds = members.map((m) => m.user_id);
  const profileMap = new Map<string, ProfileRow>();
  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", memberIds);
    for (const p of (profiles ?? []) as ProfileRow[]) {
      profileMap.set(p.id, p);
    }
  }

  const department = (team.departments as unknown as { name: string } | null) ?? null;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-8 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {department?.name ?? "Cross-functional"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-8 overflow-y-auto px-8 py-6 md:grid-cols-2">
        <section>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              Members{" "}
              <span className="text-xs text-muted-foreground">
                ({members.length})
              </span>
            </h2>
          </header>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <ul className="overflow-hidden rounded-md border border-border">
              {members.map((m) => {
                const profile = profileMap.get(m.user_id);
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-3 border-b border-border bg-card px-3 py-2 last:border-b-0"
                  >
                    <Avatar className="h-8 w-8">
                      {profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt="" />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {initials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm">
                      {profile?.full_name ?? "Unnamed"}
                    </span>
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {m.role}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Member invitations land in a later phase (requires email infra).
          </p>
        </section>

        <section>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              Projects{" "}
              <span className="text-xs text-muted-foreground">
                ({projects.length})
              </span>
            </h2>
          </header>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet — create one from the sidebar.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-md border border-border">
              {projects.map((p) => {
                const Icon = VISIBILITY_ICON[p.visibility];
                return (
                  <li key={p.id}>
                    <Link
                      href={`/app/projects/${p.id}`}
                      className="flex items-center gap-3 border-b border-border bg-card px-3 py-2.5 text-sm last:border-b-0 transition-colors hover:bg-accent"
                    >
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{p.name}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {p.visibility}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
