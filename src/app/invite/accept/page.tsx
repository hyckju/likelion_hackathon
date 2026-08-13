import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRelationType } from "@/lib/relations";
import AcceptInviteForm from "./AcceptInviteForm";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ inviter?: string; type?: string }>;
}) {
  const { inviter, type } = await searchParams;

  if (!inviter || !type || !isRelationType(type)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">
          유효하지 않은 초대 링크예요.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/invite/accept?inviter=${inviter}&type=${type}`)}`,
    );
  }

  if (user.id === inviter) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">
          본인이 만든 초대 링크는 수락할 수 없어요.
        </p>
      </div>
    );
  }

  const { data: inviterProfile } = (await supabase
    .rpc("get_invite_profile", { inviter_id: inviter })
    .single()) as { data: { name: string } | null };

  if (!inviterProfile?.name) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">
          초대한 사람을 찾을 수 없어요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-1 text-2xl font-bold text-black dark:text-zinc-50">
          {inviterProfile.name}님의 초대
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          나는 {inviterProfile.name}님의 <strong>{type}</strong>이(가) 돼요.
        </p>
        <AcceptInviteForm inviterId={inviter} relationType={type} />
      </div>
    </div>
  );
}
