import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { InboxNotification } from "@/lib/inbox-data";

/** Browser-side counterpart of loadInbox for realtime invalidation. */
export async function loadInboxClient(): Promise<InboxNotification[]> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("notifications")
    .select(
      "id, kind, payload, read_at, created_at, project_id, task_id, actor_id"
    )
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const list = (rows ?? []) as Array<{
    id: string;
    kind: string;
    payload: Record<string, unknown> | null;
    read_at: string | null;
    created_at: string;
    project_id: string | null;
    task_id: string | null;
    actor_id: string | null;
  }>;

  const taskIds = Array.from(
    new Set(list.map((r) => r.task_id).filter((v): v is string => Boolean(v)))
  );
  const projectIds = Array.from(
    new Set(list.map((r) => r.project_id).filter((v): v is string => Boolean(v)))
  );
  const actorIds = Array.from(
    new Set(list.map((r) => r.actor_id).filter((v): v is string => Boolean(v)))
  );

  const [tasksRes, projectsRes, profilesRes] = await Promise.all([
    taskIds.length
      ? supabase.from("tasks").select("id, title").in("id", taskIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    projectIds.length
      ? supabase.from("projects").select("id, name").in("id", projectIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    actorIds.length
      ? supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", actorIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            full_name: string | null;
            avatar_url: string | null;
          }[],
        }),
  ]);

  const taskMap = new Map(
    ((tasksRes.data ?? []) as { id: string; title: string }[]).map((t) => [
      t.id,
      t,
    ])
  );
  const projectMap = new Map(
    ((projectsRes.data ?? []) as { id: string; name: string }[]).map((p) => [
      p.id,
      p,
    ])
  );
  const actorMap = new Map(
    ((profilesRes.data ?? []) as {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    }[]).map((p) => [p.id, p])
  );

  return list.map((r) => ({
    id: r.id,
    kind: r.kind,
    payload: r.payload ?? {},
    readAt: r.read_at,
    createdAt: r.created_at,
    projectId: r.project_id,
    projectName: r.project_id ? projectMap.get(r.project_id)?.name ?? null : null,
    taskId: r.task_id,
    taskTitle: r.task_id ? taskMap.get(r.task_id)?.title ?? null : null,
    actorId: r.actor_id,
    actorName: r.actor_id ? actorMap.get(r.actor_id)?.full_name ?? null : null,
    actorAvatarUrl: r.actor_id ? actorMap.get(r.actor_id)?.avatar_url ?? null : null,
  }));
}
