"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { format, isPast, isToday } from "date-fns";
import { CalendarDays, Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import { matchesFilters, parseFilters } from "@/lib/filters";
import { useTaskNavigation } from "@/components/task/use-task-navigation";
import type { BoardSection, BoardTask } from "@/lib/board-data";

const PRIORITY_COLOR: Record<BoardTask["priority"], string> = {
  low: "text-slate-400",
  medium: "text-sky-500",
  high: "text-amber-500",
  urgent: "text-red-500",
};

export function ListView({ sections }: { sections: BoardSection[] }) {
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const { openTask } = useTaskNavigation();

  const filtered = sections.map((s) => ({
    ...s,
    tasks: s.tasks.filter((t) => matchesFilters(t, filters)),
  }));

  const visible = filtered.filter((s) => s.tasks.length > 0);

  return (
    <div className="flex-1 overflow-auto px-8 py-6">
      {visible.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {visible.map((section) => (
            <section key={section.id}>
              <header className="mb-2 flex items-center gap-2 text-sm font-medium">
                {section.name}
                <span className="text-xs text-muted-foreground">
                  {section.tasks.length}
                </span>
              </header>
              <ul className="overflow-hidden rounded-md border border-border bg-card">
                {section.tasks.map((task) => (
                  <li key={task.id}>
                    <button
                      onClick={() => openTask(task.id)}
                      className="grid w-full grid-cols-[1fr,140px,120px,28px] items-center gap-3 border-b border-border px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-accent"
                    >
                      <span
                        className={cn(
                          "truncate font-medium",
                          task.completedAt && "text-muted-foreground line-through"
                        )}
                      >
                        {task.title}
                      </span>
                      <DueDate task={task} />
                      <PriorityChip priority={task.priority} />
                      <AssigneeAvatar task={task} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DueDate({ task }: { task: BoardTask }) {
  if (!task.dueAt)
    return <span className="text-xs text-muted-foreground">—</span>;
  const due = new Date(task.dueAt);
  const color = task.completedAt
    ? "text-muted-foreground line-through"
    : isPast(due) && !isToday(due)
    ? "text-destructive"
    : isToday(due)
    ? "text-amber-600"
    : "text-muted-foreground";
  return (
    <span className={cn("flex items-center gap-1 text-xs", color)}>
      <CalendarDays className="h-3 w-3" />
      {format(due, "MMM d")}
    </span>
  );
}

function PriorityChip({ priority }: { priority: BoardTask["priority"] }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Flag className={cn("h-3 w-3", PRIORITY_COLOR[priority])} />
      <span className="capitalize">{priority}</span>
    </span>
  );
}

function AssigneeAvatar({ task }: { task: BoardTask }) {
  if (!task.assigneeId) return <span />;
  return (
    <Avatar className="h-6 w-6">
      {task.assigneeAvatarUrl ? (
        <AvatarImage src={task.assigneeAvatarUrl} alt={task.assigneeName ?? ""} />
      ) : null}
      <AvatarFallback className="text-[10px]">
        {initials(task.assigneeName)}
      </AvatarFallback>
    </Avatar>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-medium">No tasks match your filters.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Adjust the filter bar or clear it to see everything.
      </p>
    </div>
  );
}
