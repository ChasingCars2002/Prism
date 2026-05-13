"use client";

import { useEffect, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Send, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, initials } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createCommentAction,
  deleteCommentAction,
} from "@/lib/actions/comments";

interface CommentRow {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
}

interface CommentWithAuthor extends CommentRow {
  author: { full_name: string | null; avatar_url: string | null } | null;
}

export function CommentsThread({
  taskId,
  currentUserId,
}: {
  taskId: string;
  currentUserId: string | null;
}) {
  const supabase = createSupabaseBrowserClient();
  const qc = useQueryClient();
  const queryKey = ["comments", taskId];

  const { data: comments = [], isLoading } = useQuery<CommentWithAuthor[]>({
    queryKey,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("comments")
        .select("id, body, author_id, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      const list = (rows ?? []) as CommentRow[];
      const authorIds = Array.from(new Set(list.map((c) => c.author_id)));
      const authors = new Map<
        string,
        { full_name: string | null; avatar_url: string | null }
      >();
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", authorIds);
        for (const p of (profiles ?? []) as {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
        }[]) {
          authors.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
        }
      }
      return list.map((c) => ({ ...c, author: authors.get(c.author_id) ?? null }));
    },
  });

  // Realtime: refetch when new comments arrive for this task.
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const value = body.trim();
    if (!value) return;
    startTransition(async () => {
      await createCommentAction({ taskId, body: value });
      setBody("");
      qc.invalidateQueries({ queryKey });
    });
  };

  const remove = (id: string) => {
    if (!window.confirm("Delete this comment?")) return;
    startTransition(async () => {
      await deleteCommentAction(id);
      qc.invalidateQueries({ queryKey });
    });
  };

  return (
    <section className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Activity
      </p>

      <ul className="space-y-3">
        {isLoading ? (
          <li className="text-xs text-muted-foreground">Loading…</li>
        ) : comments.length === 0 ? (
          <li className="text-xs text-muted-foreground">No comments yet.</li>
        ) : (
          comments.map((c) => (
            <li key={c.id} className="flex gap-2">
              <Avatar className="mt-0.5 h-7 w-7 shrink-0">
                {c.author?.avatar_url ? (
                  <AvatarImage src={c.author.avatar_url} alt="" />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {initials(c.author?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">
                    {c.author?.full_name ?? "Unknown"}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                {currentUserId === c.author_id ? (
                  <button
                    onClick={() => remove(c.id)}
                    className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add a comment… (⌘/Ctrl + Enter to send)"
          className="min-h-[64px]"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={submit}
            disabled={pending || !body.trim()}
            className={cn(pending && "opacity-80")}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Comment
          </Button>
        </div>
      </div>
    </section>
  );
}
