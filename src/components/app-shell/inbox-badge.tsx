"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function InboxBadge() {
  const supabase = createSupabaseBrowserClient();
  const [count, setCount] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { head: true, count: "exact" })
        .eq("recipient_id", userId)
        .is("read_at", null);
      setCount(count ?? 0);
    };
    void fetchCount();

    const channel = supabase
      .channel(`inbox-badge:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => void fetchCount()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  if (!count) return null;
  return (
    <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}
