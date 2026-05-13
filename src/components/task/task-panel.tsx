"use client";

import { useEffect, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  Check,
  Flag,
  Loader2,
  Trash2,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import { useTaskNavigation } from "@/components/task/use-task-navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteTaskAction,
  updateTaskAction,
} from "@/lib/actions/tasks";
import type { TaskPriority } from "@/lib/supabase/types";

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "text-slate-400" },
  { value: "medium", label: "Medium", color: "text-sky-500" },
  { value: "high", label: "High", color: "text-amber-500" },
  { value: "urgent", label: "Urgent", color: "text-red-500" },
];

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_at: string | null;
  completed_at: string | null;
  assignee_id: string | null;
  assignee: { full_name: string | null; avatar_url: string | null } | null;
}

export function TaskPanel({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string | null;
}) {
  const { closeTask } = useTaskNavigation();
  const open = Boolean(taskId);

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? null : closeTask())}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {taskId ? (
          <TaskPanelBody projectId={projectId} taskId={taskId} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TaskPanelBody({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  const { closeTask } = useTaskNavigation();
  const supabase = createSupabaseBrowserClient();
  const [pending, startTransition] = useTransition();

  const { data, isLoading, refetch } = useQuery<TaskDetail | null>({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const { data: row } = await supabase
        .from("tasks")
        .select(
          "id, title, description, priority, due_at, completed_at, assignee_id"
        )
        .eq("id", taskId)
        .maybeSingle();
      if (!row) return null;

      let assignee: TaskDetail["assignee"] = null;
      if (row.assignee_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", row.assignee_id)
          .maybeSingle();
        if (profile) assignee = profile;
      }
      return { ...row, assignee } as TaskDetail;
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (data) {
      setTitle(data.title);
      setDescription(data.description ?? "");
    }
  }, [data]);

  const persist = (patch: Parameters<typeof updateTaskAction>[0]["patch"]) => {
    startTransition(async () => {
      await updateTaskAction({ taskId, projectId, patch });
      refetch();
    });
  };

  const toggleDone = () => {
    persist({ completed_at: data?.completed_at ? null : new Date().toISOString() });
  };

  const remove = () => {
    if (!window.confirm("Delete this task?")) return;
    startTransition(async () => {
      await deleteTaskAction(taskId, projectId);
      closeTask();
    });
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const completed = Boolean(data.completed_at);

  return (
    <>
      <SheetHeader className="border-b border-border">
        <div className="flex items-center justify-between gap-3 pr-8">
          <button
            onClick={toggleDone}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
              completed
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-input hover:border-emerald-500 hover:text-emerald-500"
            )}
            aria-label={completed ? "Mark as not done" : "Mark as done"}
          >
            {completed ? <Check className="h-3.5 w-3.5" /> : null}
          </button>
          <SheetTitle className="sr-only">{data.title}</SheetTitle>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title !== data.title) {
                persist({ title: title.trim() });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className={cn(
              "h-9 flex-1 border-none px-1 text-base font-semibold shadow-none focus-visible:ring-0",
              completed && "line-through opacity-60"
            )}
          />
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <dl className="grid grid-cols-[120px,1fr] items-center gap-y-3 text-sm">
          <MetaLabel icon={User}>Assignee</MetaLabel>
          <div>
            {data.assignee_id ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {data.assignee?.avatar_url ? (
                    <AvatarImage src={data.assignee.avatar_url} alt="" />
                  ) : null}
                  <AvatarFallback className="text-[10px]">
                    {initials(data.assignee?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span>{data.assignee?.full_name ?? "Unknown"}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </div>

          <MetaLabel icon={Calendar}>Due date</MetaLabel>
          <input
            type="date"
            value={data.due_at ? format(new Date(data.due_at), "yyyy-MM-dd") : ""}
            onChange={(e) => {
              const value = e.target.value
                ? new Date(e.target.value).toISOString()
                : null;
              persist({ due_at: value });
            }}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          />

          <MetaLabel icon={Flag}>Priority</MetaLabel>
          <select
            value={data.priority}
            onChange={(e) => persist({ priority: e.target.value as TaskPriority })}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </dl>

        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </p>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (data.description ?? "")) {
                persist({ description: description || null });
              }
            }}
            placeholder="Add more detail…"
            className="min-h-[160px]"
          />
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-border px-6 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={remove}
          disabled={pending}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
        {pending ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Saved</span>
        )}
      </footer>
    </>
  );
}

function MetaLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </dt>
  );
}
