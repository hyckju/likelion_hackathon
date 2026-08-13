import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureTodaysSchedules } from "@/lib/schedule";
import SignOutButton from "./SignOutButton";

type Connection = {
  otherName: string;
  label: string;
};

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/home");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  if (!profile?.name) {
    redirect("/onboarding");
  }

  const [{ data: asInviter }, { data: asPartner }] = await Promise.all([
    supabase
      .from("relationships")
      .select("partner_id, relation_type")
      .eq("user_id", user.id)
      .eq("status", "accepted"),
    supabase
      .from("relationships")
      .select("user_id, relation_type")
      .eq("partner_id", user.id)
      .eq("status", "accepted"),
  ]);

  const otherIds = [
    ...(asInviter ?? []).map((r) => r.partner_id),
    ...(asPartner ?? []).map((r) => r.user_id),
  ];

  let namesById = new Map<string, string>();
  if (otherIds.length > 0) {
    const { data: others } = await supabase
      .from("users")
      .select("id, name")
      .in("id", otherIds);
    namesById = new Map((others ?? []).map((u) => [u.id, u.name]));
  }

  const connections: Connection[] = [
    ...(asInviter ?? []).map((r) => ({
      otherName: namesById.get(r.partner_id) ?? "이름 없음",
      label: `나의 ${r.relation_type}`,
    })),
    ...(asPartner ?? []).map((r) => ({
      otherName: namesById.get(r.user_id) ?? "이름 없음",
      label: `나는 이 사람의 ${r.relation_type}`,
    })),
  ];

  const todaysSchedules = await ensureTodaysSchedules(supabase, user.id);
  const now = new Date();

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
            {profile.name}님, 안녕하세요
          </h1>
          <SignOutButton />
        </div>

        <div className="mb-6 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            오늘의 복용 일정
          </h2>
          {todaysSchedules.length === 0 ? (
            <p className="rounded-lg bg-zinc-100 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              등록된 영양제가 없어요.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todaysSchedules.map((s) => {
                const time = new Date(s.scheduledTime);
                const isDue = s.status === "pending" && time <= now;
                const timeLabel = time.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Seoul",
                });
                return (
                  <li
                    key={s.id}
                    className={`rounded-lg border p-4 ${
                      isDue
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <p className="font-medium">{s.supplementName}</p>
                    <p
                      className={`text-sm ${isDue ? "opacity-80" : "text-zinc-500 dark:text-zinc-400"}`}
                    >
                      {s.status === "completed"
                        ? `${timeLabel} · 복용 완료`
                        : isDue
                          ? "지금 먹을 시간이에요"
                          : `${timeLabel} 예정`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mb-6 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            연결된 가족·친구
          </h2>
          {connections.length === 0 ? (
            <p className="rounded-lg bg-zinc-100 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              아직 연결된 사람이 없어요. 초대 링크를 보내보세요.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {connections.map((c, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <p className="font-medium text-black dark:text-zinc-50">
                    {c.otherName}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {c.label}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/supplements/new"
            className="block rounded-full bg-foreground px-5 py-3 text-center text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            영양제 등록하기
          </Link>
          <Link
            href="/supplements"
            className="block rounded-full border border-zinc-300 px-5 py-3 text-center text-base font-medium text-black transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            내 영양제 보기
          </Link>
          <Link
            href="/invite"
            className="block rounded-full border border-zinc-300 px-5 py-3 text-center text-base font-medium text-black transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            초대 링크 만들기
          </Link>
        </div>
      </div>
    </div>
  );
}
