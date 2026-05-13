import { notFound } from "next/navigation";
import { Globe, Lock, Users } from "lucide-react";
import { loadBoardData } from "@/lib/board-data";
import { Board } from "@/components/board/board";
import { TaskPanel } from "@/components/task/task-panel";

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
  searchParams: { task?: string };
}) {
  const data = await loadBoardData(params.id);
  if (!data) notFound();

  const VisIcon = VISIBILITY_ICON[data.project.visibility];

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
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <VisIcon className="h-3 w-3" />
          {VISIBILITY_LABEL[data.project.visibility]}
        </div>
      </header>

      <Board
        projectId={data.project.id}
        initialSections={data.sections}
      />

      <TaskPanel projectId={data.project.id} taskId={searchParams.task ?? null} />
    </div>
  );
}
