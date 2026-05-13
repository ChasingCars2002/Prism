import type { BoardTask } from "@/lib/board-data";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";

export type ProjectView = "board" | "list" | "timeline";
export type FilterLogic = "and" | "or";

export interface TaskFilters {
  q: string;
  assignees: string[];
  priorities: TaskPriority[];
  statuses: TaskStatus[];
  /** "completed" | "open" | "" */
  completion: "" | "completed" | "open";
  logic: FilterLogic;
}

export const EMPTY_FILTERS: TaskFilters = {
  q: "",
  assignees: [],
  priorities: [],
  statuses: [],
  completion: "",
  logic: "and",
};

export function parseView(value: string | undefined | null): ProjectView {
  if (value === "list" || value === "timeline") return value;
  return "board";
}

function csv(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

interface QueryParams {
  get(name: string): string | null;
}

export function parseFilters(params: QueryParams): TaskFilters {
  return {
    q: params.get("q")?.trim() ?? "",
    assignees: csv(params.get("assignee")),
    priorities: csv(params.get("priority")) as TaskPriority[],
    statuses: csv(params.get("status")) as TaskStatus[],
    completion: ((params.get("done") as "completed" | "open") ?? "") || "",
    logic: params.get("logic") === "or" ? "or" : "and",
  };
}

export function filtersToParams(filters: TaskFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.assignees.length)
    params.set("assignee", filters.assignees.join(","));
  if (filters.priorities.length)
    params.set("priority", filters.priorities.join(","));
  if (filters.statuses.length) params.set("status", filters.statuses.join(","));
  if (filters.completion) params.set("done", filters.completion);
  if (filters.logic === "or") params.set("logic", "or");
  return params;
}

export function isFilterActive(filters: TaskFilters): boolean {
  return (
    Boolean(filters.q) ||
    filters.assignees.length > 0 ||
    filters.priorities.length > 0 ||
    filters.statuses.length > 0 ||
    Boolean(filters.completion)
  );
}

/**
 * AND/OR predicate. AND: every active predicate must match. OR: at least
 * one active predicate must match. `q` always behaves as a hard AND
 * filter (a search box that didn't actually search would be unusable).
 */
export function matchesFilters(task: BoardTask, f: TaskFilters): boolean {
  if (f.q) {
    const needle = f.q.toLowerCase();
    const haystack = `${task.title} ${task.description ?? ""} ${
      task.assigneeName ?? ""
    }`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  const predicates: (() => boolean | null)[] = [
    () =>
      f.assignees.length === 0
        ? null
        : task.assigneeId !== null && f.assignees.includes(task.assigneeId),
    () =>
      f.priorities.length === 0 ? null : f.priorities.includes(task.priority),
    () => (f.statuses.length === 0 ? null : f.statuses.includes(task.status)),
    () => {
      if (!f.completion) return null;
      return f.completion === "completed"
        ? Boolean(task.completedAt)
        : !task.completedAt;
    },
  ];

  const results = predicates.map((fn) => fn());
  const active = results.filter((v): v is boolean => v !== null);
  if (active.length === 0) return true;

  return f.logic === "or" ? active.some(Boolean) : active.every(Boolean);
}
