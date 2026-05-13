"use server";

import { revalidatePath } from "next/cache";
import { generateKeyBetween } from "fractional-indexing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createSectionAction(input: {
  projectId: string;
  name: string;
}): Promise<{ error?: string; id?: string }> {
  const supabase = createSupabaseServerClient();
  const name = input.name.trim();
  if (!name) return { error: "Name is required." };

  const { data: last } = await supabase
    .from("task_sections")
    .select("position")
    .eq("project_id", input.projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = generateKeyBetween(last?.position ?? null, null);

  const { data, error } = await supabase
    .from("task_sections")
    .insert({ project_id: input.projectId, name, position })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/app/projects/${input.projectId}`);
  return { id: data?.id };
}

export async function renameSectionAction(input: {
  sectionId: string;
  projectId: string;
  name: string;
}): Promise<{ error?: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("task_sections")
    .update({ name: input.name.trim() })
    .eq("id", input.sectionId);

  if (error) return { error: error.message };
  revalidatePath(`/app/projects/${input.projectId}`);
  return {};
}
