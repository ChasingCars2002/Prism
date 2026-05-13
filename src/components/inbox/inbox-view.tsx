"use client";

import { useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Inbox as InboxIcon, MessageCircle, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  markAllReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications";
import { loadInboxClient } from "@/lib/inbox-client";
import type { InboxNotification } from "@/lib/inbox-data";

const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  comment: MessageCircle,
  assignment: UserPlus,
};

interface InboxViewProps {
  initial: InboxNotification[];
  currentUserId: string | null;
}

export function InboxView({ initial, currentUserId }: InboxViewProps) {
  const supabase = createSupabaseBrowserClient();
  const qc = useQueryClient();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const queryKey = ["inbox", currentUserId];
  const { data = initial } = useQuery<InboxNotification[]>({
    queryKey,
    initialData: initial,
    queryFn: () => loadInboxClient(),
  });

  // Realtime: any new notification for me invalidates the query.
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`inbox:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUserId}`,
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
  }, [currentUserId]);

  const groups = useMemo(() => {
    const byProject = new Map<string, InboxNotification[]>();
    for (const n of data) {
      const key = n.projectId ?? "_orphan";
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key)!.push(n);
    }
    return Array.from(byProject.entries());
  }, [data]);

  const unreadCount = data.filter((n) => !n.readAt).length;

  const onOpen = (n: InboxNotification) => {
    if (!n.readAt) {
      startTransition(async () => {
        await markNotificationReadAction(n.id);
        qc.invalidateQueries({ queryKey });
      });
    }
    if (n.projectId && n.taskId) {
      router.push(`/app/projects/${n.projectId}?task=${n.taskId}`);
    } else if (n.projectId) {
      router.push(`/app/projects/${n.projectId}`);
    }
  };

  const markAll = () => {
    startTransition(async () => {
      await markAllReadAction();
      qc.invalidateQueries({ queryKey });
    });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-8 py-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Notifications
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Inbox{" "}
            {unreadCount > 0 ? (
              <span className="ml-2 rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground align-middle">
                {unreadCount}
              </span>
            ) : null}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={markAll}
          disabled={pending || unreadCount === 0}
        >
          <CheckCheck className="mr-1.5 h-4 w-4" />
          Mark all read
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {data.length === 0 ? (
          <EmptyInbox />
        ) : (
          <div className="space-y-6">
            {groups.map(([projectId, items]) => {
              const projectName = items[0]?.projectName ?? "Other";
              return (
                <section key={projectId}>
                  <header className="mb-2 flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {projectName}
                    <span className="text-muted-foreground/60">·</span>
                    <span>{items.length}</span>
                  </header>
                  <ul className="overflow-hidden rounded-md border border-border">
                    {items.map((n) => (
                      <li key={n.id}>
                        <button
                          onClick={() => onOpen(n)}
                          className={cn(
                            "flex w-full items-start gap-3 border-b border-border bg-card px-3 py-3 text-left last:border-b-0 transition-colors hover:bg-accent",
                            !n.readAt && "bg-primary/5"
                          )}
                        >
                          <NotifIcon kind={n.kind} actor={n} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">
                              <NotifMessage notification={n} />
                            </p>
                            {n.taskTitle ? (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {n.taskTitle}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(n.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          {!n.readAt ? (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function NotifIcon({
  kind,
  actor,
}: {
  kind: string;
  actor: InboxNotification;
}) {
  const Icon = KIND_ICON[kind];
  if (actor.actorId) {
    return (
      <Avatar className="h-8 w-8 shrink-0">
        {actor.actorAvatarUrl ? (
          <AvatarImage src={actor.actorAvatarUrl} alt="" />
        ) : null}
        <AvatarFallback className="text-[10px]">
          {initials(actor.actorName)}
        </AvatarFallback>
      </Avatar>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
      {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
    </div>
  );
}

function NotifMessage({ notification }: { notification: InboxNotification }) {
  const actor = notification.actorName ?? "Someone";
  switch (notification.kind) {
    case "comment":
      return (
        <>
          <strong className="font-medium">{actor}</strong> commented on a task
        </>
      );
    case "assignment":
      return (
        <>
          <strong className="font-medium">{actor}</strong> assigned a task to you
        </>
      );
    default:
      return (
        <>
          <strong className="font-medium">{actor}</strong> {notification.kind}
        </>
      );
  }
}

function EmptyInbox() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <div className="rounded-full bg-muted p-4">
        <InboxIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium">No notifications</p>
      <p className="text-sm text-muted-foreground">
        When teammates comment on or assign you tasks, they&rsquo;ll show up
        here grouped by project.
      </p>
      <Link
        href="/app"
        className="text-sm text-foreground underline-offset-4 hover:underline"
      >
        Back home
      </Link>
    </div>
  );
}
