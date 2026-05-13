"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateKeyBetween } from "fractional-indexing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify, randomSuffix } from "@/lib/slug";
import type { ProjectVisibility } from "@/lib/supabase/types";

export interface CreateProjectInput {
  teamId: string;
  name: string;
  description?: string;
  visibility?: ProjectVisibility;
  redirectAfter?: boolean;
}

const DEFAULT_SECTIONS = ["Backlog", "In Progress", "Done"];

export async function createProjectAction(
  input: CreateProjectInput
): Promise<{ error?: string; id?: string }> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = input.name.trim();
  if (!name) return { error: "Project name is required." };

  const slug = `${slugify(name)}-${randomSuffix(3)}`;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      team_id: input.teamId,
      name,
      slug,
      description: input.description?.trim() || null,
      visibility: input.visibility ?? "private",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    return { error: projectError?.message ?? "Could not create project." };
  }

  // Seed three default sections with monotonically increasing fractional keys.
  let prevKey: string | null = null;
  const sectionRows = DEFAULT_SECTIONS.map((sectionName) => {
    const key = generateKeyBetween(prevKey, null);
    prevKey = key;
    return {
      project_id: project.id,
      name: sectionName,
      position: key,
    };
  });

  const { error: sectionError } = await supabase
    .from("task_sections")
    .insert(sectionRows);

  if (sectionError) {
    return { error: sectionError.message };
  }

  revalidatePath("/app", "layout");

  if (input.redirectAfter) {
    redirect(`/app/projects/${project.id}`);
  }

  return { id: project.id };
}
