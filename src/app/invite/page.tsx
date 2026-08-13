import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InviteForm from "./InviteForm";

export default async function InvitePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/invite");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-black dark:text-zinc-50">
          초대 링크 만들기
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          초대할 사람이 나에게 어떤 사이인지 골라주세요.
        </p>
        <InviteForm inviterId={user.id} />
      </div>
    </div>
  );
}
