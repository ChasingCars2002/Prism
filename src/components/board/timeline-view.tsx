"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isToday,
  startOfMonth,
} from "date-fns";
import { cn } from "@/lib/utils";
import { matchesFilters, parseFilters } from "@/lib/filters";
import { useTaskNavigation } from "@/components/task/use-task-navigation";
import type { BoardSection, BoardTask } from "@/lib/board-data";

const DAY_PX = 32;

const PRIORITY_BG: Record<BoardTask["priority"], string> = {
  low: "bg-slate-400/80",
  medium: "bg-sky-500/80",
  high: "bg-amber-500/80",
  urgent: "bg-red-500/80",
};

/**
 * Timeline view — a lightweight Gantt. Tasks render as a single-day pill at
 * their due date (no start_date in schema yet). Tasks without a due date
 * are listed in an "Unscheduled" gutter so they're still visible.
 */
export function TimelineView({ sections }: { sections: BoardSection[] }) {
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const { openTask } = useTaskNavigation();

  const allTasks = sections.flatMap((s) => s.tasks);
  const filtered = allTasks.filter((t) => matchesFilters(t, filters));

  const { rangeStart, rangeEnd, days } = useMemo(() => {
    const dates = filtered
      .map((t) => (t.dueAt ? new Date(t.dueAt) : null))
      .filter((d): d is Date => d !== null);
    const now = new Date();
    const baseStart = dates.length
      ? new Date(Math.min(...dates.map((d) => d.getTime()), now.getTime()))
      : now;
    const baseEnd = dates.length
      ? new Date(Math.max(...dates.map((d) => d.getTime()), now.getTime()))
      : addDays(now, 14);
    const start = startOfMonth(baseStart);
    const end = endOfMonth(baseEnd);
    const dayCount = differenceInCalendarDays(end, start) + 1;
    return {
      rangeStart: start,
      rangeEnd: end,
      days: Array.from({ length: dayCount }, (_, i) => addDays(start, i)),
    };
  }, [filtered]);

  const scheduled = filtered.filter((t) => t.dueAt !== null);
  const unscheduled = filtered.filter((t) => t.dueAt === null);

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex">
        {/* Left rail: task titles */}
        <div className="sticky left-0 z-10 w-56 shrink-0 border-r border-border bg-background">
          <div className="h-10 border-b border-border bg-muted px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <div className="flex h-full items-center">Task</div>
          </div>
          {scheduled.map((task) => (
            <div
              key={task.id}
              className="h-9 truncate border-b border-border px-3 text-xs"
            >
              <div className="flex h-full items-center">{task.title}</div>
            </div>
          ))}
          {unscheduled.length > 0 ? (
            <div className="border-t-2 border-border">
              <div className="h-9 border-b border-border bg-muted/40 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="flex h-full items-center">Unscheduled</div>
              </div>
              {unscheduled.map((task) => (
                <div
                  key={task.id}
                  className="h-9 truncate border-b border-border px-3 text-xs text-muted-foreground"
                >
                  <div className="flex h-full items-center">{task.title}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Right pane: day cells */}
        <div className="flex-1">
          <div
            className="flex h-10 border-b border-border bg-muted text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            style={{ minWidth: days.length * DAY_PX }}
          >
            {days.map((d) => (
              <div
                key={d.toISOString()}
                style={{ width: DAY_PX }}
                className={cn(
                  "flex flex-col items-center justify-center border-r border-border",
                  isToday(d) && "bg-primary/10 text-primary"
                )}
              >
                <span>{format(d, "EEEEE")}</span>
                <span className="text-[10px] tabular-nums">
                  {format(d, "d")}
                </span>
              </div>
            ))}
          </div>

          {scheduled.map((task) => {
            const due = new Date(task.dueAt as string);
            const offset = differenceInCalendarDays(due, rangeStart);
            return (
              <div
                key={task.id}
                className="relative h-9 border-b border-border"
                style={{ minWidth: days.length * DAY_PX }}
              >
                <button
                  onClick={() => openTask(task.id)}
                  style={{
                    left: offset * DAY_PX + 4,
                    width: DAY_PX - 8,
                  }}
                  className={cn(
                    "absolute top-1.5 flex h-6 items-center justify-center rounded-md px-1 text-[10px] font-medium text-white shadow-sm transition hover:opacity-90",
                    PRIORITY_BG[task.priority],
                    task.completedAt && "opacity-60"
                  )}
                  title={task.title}
                >
                  {format(due, "d")}
                </button>
              </div>
            );
          })}

          {unscheduled.length > 0 ? (
            <div className="border-t-2 border-border">
              <div
                className="h-9 border-b border-border bg-muted/40"
                style={{ minWidth: days.length * DAY_PX }}
              />
              {unscheduled.map((task) => (
                <div
                  key={task.id}
                  className="h-9 border-b border-border"
                  style={{ minWidth: days.length * DAY_PX }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <p className="px-4 py-2 text-[11px] text-muted-foreground">
        {format(rangeStart, "MMM yyyy")} → {format(rangeEnd, "MMM yyyy")} ·{" "}
        {scheduled.length} scheduled · {unscheduled.length} unscheduled
      </p>
    </div>
  );
}
