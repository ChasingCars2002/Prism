import { loadInbox } from "@/lib/inbox-data";
import { InboxView } from "@/components/inbox/inbox-view";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InboxPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initial = await loadInbox();

  return (
    <div className="flex h-full flex-col">
      <InboxView initial={initial} currentUserId={user?.id ?? null} />
    </div>
  );
}
