"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  EMPTY_FILTERS,
  filtersToParams,
  isFilterActive,
  parseFilters,
  type FilterLogic,
  type TaskFilters,
} from "@/lib/filters";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

interface AssigneeOption {
  id: string;
  name: string;
}

export function FilterBar({
  assignees,
}: {
  assignees: AssigneeOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const [open, setOpen] = useState(false);

  const apply = (next: TaskFilters) => {
    const fp = filtersToParams(next);
    // preserve non-filter params (view, task)
    for (const [k, v] of params.entries()) {
      if (!["q", "assignee", "priority", "status", "done", "logic"].includes(k)) {
        fp.set(k, v);
      }
    }
    const q = fp.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const toggle = <K extends "assignees" | "priorities" | "statuses">(
    key: K,
    value: string
  ) => {
    const set = new Set(filters[key] as string[]);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    apply({ ...filters, [key]: Array.from(set) } as TaskFilters);
  };

  const setLogic = (logic: FilterLogic) => apply({ ...filters, logic });
  const setQ = (q: string) => apply({ ...filters, q });
  const setCompletion = (completion: TaskFilters["completion"]) =>
    apply({ ...filters, completion });
  const clearAll = () => apply(EMPTY_FILTERS);

  const active = isFilterActive(filters);

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-background px-8 py-2.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks…"
            className="h-8 pl-8 text-sm"
          />
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent",
            open && "bg-accent"
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
          {active ? (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
              {[
                filters.assignees.length,
                filters.priorities.length,
                filters.statuses.length,
                filters.completion ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          ) : null}
        </button>

        <div role="tablist" className="inline-flex rounded-md border border-input bg-background p-0.5 text-xs">
          {(["and", "or"] as FilterLogic[]).map((logic) => (
            <button
              key={logic}
              role="tab"
              aria-selected={filters.logic === logic}
              onClick={() => setLogic(logic)}
              className={cn(
                "rounded-sm px-2 py-0.5 font-medium uppercase tracking-wider transition-colors",
                filters.logic === logic
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {logic}
            </button>
          ))}
        </div>

        {active ? (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-card p-3 md:grid-cols-3">
          <FacetGroup
            label="Assignee"
            options={assignees.map((a) => ({ value: a.id, label: a.name }))}
            selected={filters.assignees}
            onToggle={(v) => toggle("assignees", v)}
            emptyLabel="No teammates yet"
          />
          <FacetGroup
            label="Priority"
            options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
            selected={filters.priorities}
            onToggle={(v) => toggle("priorities", v)}
          />
          <FacetGroup
            label="Status"
            options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            selected={filters.statuses}
            onToggle={(v) => toggle("statuses", v)}
          />

          <div className="md:col-span-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Completion
            </p>
            <div className="flex gap-1">
              {(
                [
                  { v: "", label: "Any" },
                  { v: "open", label: "Open" },
                  { v: "completed", label: "Completed" },
                ] as { v: TaskFilters["completion"]; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setCompletion(opt.v)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs",
                    filters.completion === opt.v
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FacetGroup({
  label,
  options,
  selected,
  onToggle,
  emptyLabel,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyLabel?: string;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel ?? "None"}</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {options.map((opt) => {
            const on = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => onToggle(opt.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition-colors",
                  on
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
