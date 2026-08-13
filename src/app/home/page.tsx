import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureTodaysSchedules } from "@/lib/schedule";
import { generateNagsForMyConnections, getTodaysReceivedNags } from "@/lib/nags";
import { getAcceptedConnections } from "@/lib/connections";
import {
  getPendingReactionPrompts,
  getReceivedReactionsToday,
} from "@/lib/reactions";
import { computeStreak } from "@/lib/streak";
import { getSupplementInventory, repurchaseLink } from "@/lib/inventory";
import SignOutButton from "./SignOutButton";
import ReactionPrompts from "./ReactionPrompts";
import StreakWidget from "./StreakWidget";

type ConnectionDisplay = {
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

  const accepted = await getAcceptedConnections(supabase, user.id);

  let namesById = new Map<string, string>();
  if (accepted.length > 0) {
    const { data: others } = await supabase
      .from("users")
      .select("id, name")
      .in(
        "id",
        accepted.map((c) => c.otherId),
      );
    namesById = new Map((others ?? []).map((u) => [u.id, u.name]));
  }

  const connections: ConnectionDisplay[] = accepted.map((c) => ({
    otherName: namesById.get(c.otherId) ?? "이름 없음",
    label:
      c.perspective === "inviter"
        ? `나의 ${c.relationType}`
        : `나는 이 사람의 ${c.relationType}`,
  }));

  const todaysSchedules = await ensureTodaysSchedules(supabase, user.id);
  await generateNagsForMyConnections(supabase, user.id);
  const receivedNags = await getTodaysReceivedNags(supabase, user.id);
  const reactionPrompts = await getPendingReactionPrompts(supabase, user.id);
  const receivedReactions = await getReceivedReactionsToday(supabase, user.id);
  const streak = await computeStreak(supabase, user.id);
  const inventory = await getSupplementInventory(supabase, user.id);
  const lowStockSupplements = inventory.filter((i) => i.isLow);
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

        <StreakWidget streak={streak} />

        {lowStockSupplements.length > 0 && (
          <div className="mb-6 flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              곧 떨어져요
            </h2>
            <ul className="flex flex-col gap-2">
              {lowStockSupplements.map((inv) => (
                <li
                  key={inv.id}
                  className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950"
                >
                  <p className="font-medium text-red-900 dark:text-red-200">
                    {inv.name} 잔여 {inv.remainingQuantity}개 (약{" "}
                    {inv.daysRemaining}일분)
                  </p>
                  <a
                    href={repurchaseLink(inv.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    재구매하기
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {receivedReactions.length > 0 && (
          <div className="mb-6 flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              받은 응원
            </h2>
            <ul className="flex flex-col gap-2">
              {receivedReactions.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <p className="text-black dark:text-zinc-50">
                    <span className="mr-2 text-lg">{r.emojiOrText}</span>
                    {r.senderName}님이 {r.supplementName} 복용을 응원했어요
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ReactionPrompts prompts={reactionPrompts} />

        {receivedNags.length > 0 && (
          <div className="mb-6 flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              잔소리 도착
            </h2>
            <ul className="flex flex-col gap-2">
              {receivedNags.map((nag) => (
                <li
                  key={nag.id}
                  className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
                >
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    {nag.message}
                  </p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    {nag.senderName}님이 보냄
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

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
                    <div className="flex items-center justify-between gap-3">
                      <div>
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
                      </div>
                      {s.status === "pending" && (
                        <Link
                          href={`/verify/${s.id}`}
                          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                            isDue
                              ? "bg-white text-black dark:bg-black dark:text-white"
                              : "bg-black text-white dark:bg-white dark:text-black"
                          }`}
                        >
                          인증하기
                        </Link>
                      )}
                    </div>
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
          <Link
            href="/report"
            className="block rounded-full border border-zinc-300 px-5 py-3 text-center text-base font-medium text-black transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            주간 리포트 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
