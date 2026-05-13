import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";

export interface BoardTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
  dueAt: string | null;
  completedAt: string | null;
  sectionId: string | null;
  position: string;
  createdAt: string;
}

export interface BoardSection {
  id: string;
  name: string;
  position: string;
  tasks: BoardTask[];
}

export interface BoardData {
  project: {
    id: string;
    name: string;
    description: string | null;
    visibility: "private" | "department" | "org";
    teamId: string;
    teamName: string;
  };
  sections: BoardSection[];
}

interface RawTaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_at: string | null;
  completed_at: string | null;
  section_id: string | null;
  position: string;
  created_at: string;
}

interface RawProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export async function loadBoardData(
  projectId: string
): Promise<BoardData | null> {
  const supabase = createSupabaseServerClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description, visibility, team_id, teams(name)")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const [{ data: sections }, { data: tasks }] = await Promise.all([
    supabase
      .from("task_sections")
      .select("id, name, position")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
    supabase
      .from("tasks")
      .select(
        "id, title, description, status, priority, assignee_id, due_at, completed_at, section_id, position, created_at"
      )
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
  ]);

  const assigneeIds = Array.from(
    new Set(
      (tasks ?? [])
        .map((t) => (t as RawTaskRow).assignee_id)
        .filter((v): v is string => Boolean(v))
    )
  );
  const profileMap = new Map<string, RawProfileRow>();
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", assigneeIds);
    for (const p of (profiles ?? []) as RawProfileRow[]) profileMap.set(p.id, p);
  }

  const team = (project.teams as unknown as { name: string } | null) ?? {
    name: "",
  };

  const sectionList: BoardSection[] = (sections ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    position: s.position,
    tasks: ((tasks ?? []) as RawTaskRow[])
      .filter((t) => t.section_id === s.id)
      .map((t) => {
        const profile = t.assignee_id ? profileMap.get(t.assignee_id) : null;
        return {
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assigneeId: t.assignee_id,
          assigneeName: profile?.full_name ?? null,
          assigneeAvatarUrl: profile?.avatar_url ?? null,
          dueAt: t.due_at,
          completedAt: t.completed_at,
          sectionId: t.section_id,
          position: t.position,
          createdAt: t.created_at,
        };
      }),
  }));

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      visibility: project.visibility,
      teamId: project.team_id,
      teamName: team.name,
    },
    sections: sectionList,
  };
}

export interface ProjectAssignee {
  id: string;
  name: string;
}

export async function loadProjectAssignees(
  teamId: string
): Promise<ProjectAssignee[]> {
  const supabase = createSupabaseServerClient();
  const { data: members } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId);
  const ids = (members ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);

  return ((profiles ?? []) as { id: string; full_name: string | null }[])
    .map((p) => ({ id: p.id, name: p.full_name ?? "Unnamed" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
