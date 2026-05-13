"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createCommentAction(input: {
  taskId: string;
  body: string;
}): Promise<{ error?: string; id?: string }> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const body = input.body.trim();
  if (!body) return { error: "Comment can't be empty." };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      task_id: input.taskId,
      author_id: user.id,
      body,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data?.id };
}

export async function deleteCommentAction(
  commentId: string
): Promise<{ error?: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return { error: error.message };
  return {};
}
