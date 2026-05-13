"use server";

import { revalidatePath } from "next/cache";
import { generateKeyBetween } from "fractional-indexing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";

export interface CreateTaskInput {
  projectId: string;
  sectionId: string;
  title: string;
  /** Position key to insert at; if omitted appended to the end. */
  position?: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueAt?: string | null;
}

export async function createTaskAction(
  input: CreateTaskInput
): Promise<{ error?: string; id?: string }> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const title = input.title.trim();
  if (!title) return { error: "Title is required." };

  let position = input.position;
  if (!position) {
    const { data: last } = await supabase
      .from("tasks")
      .select("position")
      .eq("section_id", input.sectionId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    position = generateKeyBetween(last?.position ?? null, null);
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: input.projectId,
      section_id: input.sectionId,
      title,
      description: input.description?.trim() || null,
      priority: input.priority ?? "medium",
      assignee_id: input.assigneeId ?? null,
      due_at: input.dueAt ?? null,
      position,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/app/projects/${input.projectId}`);
  return { id: data?.id };
}

export interface MoveTaskInput {
  taskId: string;
  projectId: string;
  toSectionId: string;
  /** New fractional position key, generated client-side from neighbours. */
  position: string;
}

export async function moveTaskAction(
  input: MoveTaskInput
): Promise<{ error?: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      section_id: input.toSectionId,
      position: input.position,
    })
    .eq("id", input.taskId);

  if (error) return { error: error.message };
  // No revalidatePath here: optimistic UI already has truth; revalidating
  // would replace the optimistic state with a re-fetch and feel laggy.
  return {};
}

export interface UpdateTaskInput {
  taskId: string;
  projectId: string;
  patch: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee_id?: string | null;
    due_at?: string | null;
    completed_at?: string | null;
  };
}

export async function updateTaskAction(
  input: UpdateTaskInput
): Promise<{ error?: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update(input.patch)
    .eq("id", input.taskId);

  if (error) return { error: error.message };
  revalidatePath(`/app/projects/${input.projectId}`);
  return {};
}

export async function deleteTaskAction(
  taskId: string,
  projectId: string
): Promise<{ error?: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };
  revalidatePath(`/app/projects/${projectId}`);
  return {};
}
