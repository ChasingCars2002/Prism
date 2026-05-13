"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTaskAction } from "@/lib/actions/tasks";
import { Input } from "@/components/ui/input";
import type { BoardSection } from "@/lib/board-data";

export function BoardColumn({
  section,
  projectId,
  children,
  onTasksMutated,
}: {
  section: BoardSection;
  projectId: string;
  children: React.ReactNode;
  onTasksMutated: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const value = title.trim();
    if (!value) {
      setAdding(false);
      return;
    }
    startTransition(async () => {
      await createTaskAction({
        projectId,
        sectionId: section.id,
        title: value,
      });
      setTitle("");
      setAdding(false);
      onTasksMutated();
    });
  };

  return (
    <section className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-sm font-medium tracking-tight">
          {section.name}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {section.tasks.length}
          </span>
        </h2>
        <button
          onClick={() => setAdding(true)}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Add task"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 px-2 py-2">{children}</div>

      {adding ? (
        <div className="border-t border-border p-2">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                setTitle("");
                setAdding(false);
              }
            }}
            placeholder="Task title — Enter to add, Esc to cancel"
            className="h-9 text-sm"
            disabled={pending}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="border-t border-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          + Add task
        </button>
      )}
    </section>
  );
}
