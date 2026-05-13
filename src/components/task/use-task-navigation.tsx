"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useTaskNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const openTask = useCallback(
    (taskId: string) => {
      const next = new URLSearchParams(params.toString());
      next.set("task", taskId);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, params]
  );

  const closeTask = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("task");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [router, pathname, params]);

  return { openTask, closeTask };
}
