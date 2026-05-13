import { notFound } from "next/navigation";
import { Globe, Lock, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadBoardData, loadProjectAssignees } from "@/lib/board-data";
import { Board } from "@/components/board/board";
import { ListView } from "@/components/board/list-view";
import { TimelineView } from "@/components/board/timeline-view";
import { TaskPanel } from "@/components/task/task-panel";
import { FilterBar } from "@/components/project/filter-bar";
import { ViewSwitcher } from "@/components/project/view-switcher";
import { parseView } from "@/lib/filters";

const VISIBILITY_LABEL = {
  private: "Private",
  department: "Department",
  org: "Organization",
} as const;

const VISIBILITY_ICON = {
  private: Lock,
  department: Users,
  org: Globe,
} as const;

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { task?: string; view?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await loadBoardData(params.id);
  if (!data) notFound();

  const assignees = await loadProjectAssignees(data.project.teamId);
  const VisIcon = VISIBILITY_ICON[data.project.visibility];
  const view = parseView(searchParams.view);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-border px-8 py-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {data.project.teamName}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {data.project.name}
          </h1>
          {data.project.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {data.project.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <ViewSwitcher />
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <VisIcon className="h-3 w-3" />
            {VISIBILITY_LABEL[data.project.visibility]}
          </div>
        </div>
      </header>

      <FilterBar assignees={assignees} />

      {view === "board" ? (
        <Board projectId={data.project.id} initialSections={data.sections} />
      ) : view === "list" ? (
        <ListView sections={data.sections} />
      ) : (
        <TimelineView sections={data.sections} />
      )}

      <TaskPanel
        projectId={data.project.id}
        taskId={searchParams.task ?? null}
        currentUserId={user?.id ?? null}
      />
    </div>
  );
}
