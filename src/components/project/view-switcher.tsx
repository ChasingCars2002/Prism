"use client";

import { CalendarRange, KanbanSquare, List } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { parseView, type ProjectView } from "@/lib/filters";

const VIEWS: { id: ProjectView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "board", label: "Board", icon: KanbanSquare },
  { id: "list", label: "List", icon: List },
  { id: "timeline", label: "Timeline", icon: CalendarRange },
];

export function ViewSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const active = parseView(params.get("view"));

  const select = (id: ProjectView) => {
    const next = new URLSearchParams(params.toString());
    if (id === "board") next.delete("view");
    else next.set("view", id);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  return (
    <div
      role="tablist"
      className="inline-flex items-center rounded-md border border-border bg-muted p-0.5"
    >
      {VIEWS.map((v) => {
        const Icon = v.icon;
        const selected = active === v.id;
        return (
          <button
            key={v.id}
            role="tab"
            aria-selected={selected}
            onClick={() => select(v.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
