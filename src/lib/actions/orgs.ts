"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify, randomSuffix } from "@/lib/slug";

export interface OnboardingResult {
  error?: string;
}

/**
 * Bootstraps a new workspace: organization + initial department + initial team
 * + creator's membership. Run as the signed-in user (RLS-aware) — the
 * `handle_new_organization` trigger inserts the owner row.
 */
export async function createOrganizationAction(
  _prev: OnboardingResult,
  formData: FormData
): Promise<OnboardingResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const orgName = String(formData.get("org_name") ?? "").trim();
  const deptName = String(formData.get("department_name") ?? "General").trim() || "General";
  const teamName = String(formData.get("team_name") ?? "Core").trim() || "Core";

  if (!orgName) return { error: "Workspace name is required." };

  const orgSlug = `${slugify(orgName)}-${randomSuffix()}`;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      slug: orgSlug,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (orgError || !org) {
    return { error: orgError?.message ?? "Could not create workspace." };
  }

  const { data: dept, error: deptError } = await supabase
    .from("departments")
    .insert({
      organization_id: org.id,
      name: deptName,
      slug: slugify(deptName),
    })
    .select("id")
    .single();

  if (deptError || !dept) {
    return { error: deptError?.message ?? "Could not create department." };
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      organization_id: org.id,
      department_id: dept.id,
      name: teamName,
      slug: slugify(teamName),
    })
    .select("id")
    .single();

  if (teamError || !team) {
    return { error: teamError?.message ?? "Could not create team." };
  }

  await supabase
    .from("team_members")
    .insert({ team_id: team.id, user_id: user.id, role: "lead" });

  await supabase
    .from("profiles")
    .update({ default_org_id: org.id })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/app");
}

export async function createDepartmentAction(
  organizationId: string,
  name: string
): Promise<{ error?: string; id?: string }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("departments")
    .insert({
      organization_id: organizationId,
      name: name.trim(),
      slug: slugify(name),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/app", "layout");
  return { id: data?.id };
}

export async function createTeamAction(
  organizationId: string,
  departmentId: string | null,
  name: string
): Promise<{ error?: string; id?: string }> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("teams")
    .insert({
      organization_id: organizationId,
      department_id: departmentId,
      name: name.trim(),
      slug: slugify(name),
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed." };

  await supabase
    .from("team_members")
    .insert({ team_id: data.id, user_id: user.id, role: "lead" });

  revalidatePath("/app", "layout");
  return { id: data.id };
}
