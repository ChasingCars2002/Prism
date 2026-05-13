"use client";

import { CalendarDays, Flag } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import type { BoardTask } from "@/lib/board-data";

const PRIORITY_COLOR: Record<BoardTask["priority"], string> = {
  low: "text-slate-400",
  medium: "text-sky-500",
  high: "text-amber-500",
  urgent: "text-red-500",
};

export function TaskCard({
  task,
  onClick,
}: {
  task: BoardTask;
  onClick: () => void;
}) {
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const dueColor = due
    ? task.completedAt
      ? "text-muted-foreground line-through"
      : isPast(due) && !isToday(due)
      ? "text-destructive"
      : isToday(due)
      ? "text-amber-600"
      : "text-muted-foreground"
    : "text-muted-foreground";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col gap-1.5 rounded-md border border-border bg-background p-3 text-left text-sm shadow-sm transition-all hover:border-foreground/30 hover:shadow-md",
        task.completedAt && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "line-clamp-2 flex-1 text-sm font-medium leading-snug",
            task.completedAt && "line-through"
          )}
        >
          {task.title}
        </p>
        {task.priority !== "medium" ? (
          <Flag
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              PRIORITY_COLOR[task.priority]
            )}
          />
        ) : null}
      </div>

      {(task.assigneeId || due) && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {due ? (
              <span
                className={cn("flex items-center gap-1", dueColor)}
              >
                <CalendarDays className="h-3 w-3" />
                {format(due, "MMM d")}
              </span>
            ) : (
              <span />
            )}
          </div>
          {task.assigneeId ? (
            <Avatar className="h-5 w-5">
              {task.assigneeAvatarUrl ? (
                <AvatarImage
                  src={task.assigneeAvatarUrl}
                  alt={task.assigneeName ?? ""}
                />
              ) : null}
              <AvatarFallback className="text-[9px]">
                {initials(task.assigneeName)}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      )}
    </button>
  );
}
