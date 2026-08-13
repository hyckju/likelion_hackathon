import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWeeklyReport } from "@/lib/report";
import { computeStreak } from "@/lib/streak";
import ShareSummaryButton from "./ShareSummaryButton";

export default async function ReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/report");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const [report, streak] = await Promise.all([
    getWeeklyReport(supabase, user.id),
    computeStreak(supabase, user.id),
  ]);

  const summaryText = [
    `${profile?.name ?? ""}님의 이번 주 복용 리포트`,
    `복용률: ${report.adherenceRate}%`,
    report.missedDates.length > 0
      ? `놓친 날짜: ${report.missedDates.join(", ")}`
      : "놓친 날짜 없음",
    `현재 스트릭: ${streak.current}일 연속`,
  ].join("\n");

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold text-black dark:text-zinc-50">
          주간 리포트
        </h1>

        <div className="mb-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            이번 주 복용률
          </p>
          <p className="text-3xl font-bold text-black dark:text-zinc-50">
            {report.adherenceRate}%
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {report.totalCompleted} / {report.totalExpected}회 복용
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            일별 현황
          </h2>
          <ul className="flex flex-col gap-1">
            {report.days.map((d) => (
              <li
                key={d.date}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
              >
                <span className="text-black dark:text-zinc-50">
                  {d.date}
                </span>
                <span
                  className={
                    d.missed
                      ? "font-medium text-red-600 dark:text-red-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  }
                >
                  {d.expected === 0
                    ? "일정 없음"
                    : `${d.completed}/${d.expected}회${d.missed ? " · 놓침" : ""}`}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-6 rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
          <p className="text-sm text-orange-700 dark:text-orange-400">
            현재 스트릭
          </p>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">
            🔥 {streak.current}일 연속
          </p>
        </div>

        <ShareSummaryButton summaryText={summaryText} />
      </div>
    </div>
  );
}
