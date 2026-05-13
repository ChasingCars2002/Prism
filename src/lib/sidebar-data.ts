import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SidebarProject {
  id: string;
  name: string;
  slug: string;
  visibility: "private" | "department" | "org";
}

export interface SidebarTeam {
  id: string;
  name: string;
  slug: string;
  projects: SidebarProject[];
}

export interface SidebarDepartment {
  id: string;
  name: string;
  slug: string;
  teams: SidebarTeam[];
}

export interface SidebarOrg {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
  departments: SidebarDepartment[];
  /** Teams not assigned to a department. */
  unassignedTeams: SidebarTeam[];
}

export interface SidebarData {
  orgs: SidebarOrg[];
  activeOrgId: string | null;
}

/**
 * Loads the Org > Dept > Team > Project tree the signed-in user can see.
 * Relies entirely on RLS — the result is implicitly scoped to the caller.
 */
export async function loadSidebarData(): Promise<SidebarData> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { orgs: [], activeOrgId: null };

  const [
    { data: memberships },
    { data: departments },
    { data: teams },
    { data: projects },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("organization_members")
      .select("organization_id, role, organizations(id, name, slug)")
      .eq("user_id", user.id),
    supabase.from("departments").select("id, organization_id, name, slug"),
    supabase
      .from("teams")
      .select("id, organization_id, department_id, name, slug"),
    supabase
      .from("projects")
      .select("id, team_id, name, slug, visibility, archived_at"),
    supabase
      .from("profiles")
      .select("default_org_id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const orgs: SidebarOrg[] = (memberships ?? [])
    .map((m) => {
      const org = m.organizations as unknown as {
        id: string;
        name: string;
        slug: string;
      } | null;
      if (!org) return null;

      const orgDepartments = (departments ?? []).filter(
        (d) => d.organization_id === org.id
      );
      const orgTeams = (teams ?? []).filter(
        (t) => t.organization_id === org.id
      );
      const orgProjects = (projects ?? []).filter((p) =>
        orgTeams.some((t) => t.id === p.team_id)
      );

      const buildTeam = (t: (typeof orgTeams)[number]): SidebarTeam => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        projects: orgProjects
          .filter((p) => p.team_id === t.id && !p.archived_at)
          .map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            visibility: p.visibility,
          })),
      });

      const builtDepartments: SidebarDepartment[] = orgDepartments.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        teams: orgTeams.filter((t) => t.department_id === d.id).map(buildTeam),
      }));

      const unassignedTeams = orgTeams
        .filter((t) => t.department_id === null)
        .map(buildTeam);

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: m.role,
        departments: builtDepartments,
        unassignedTeams,
      };
    })
    .filter((o): o is SidebarOrg => o !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const defaultOrg = profile?.default_org_id ?? null;
  const activeOrgId =
    orgs.find((o) => o.id === defaultOrg)?.id ?? orgs[0]?.id ?? null;

  return { orgs, activeOrgId };
}
