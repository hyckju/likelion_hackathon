import type { StreakInfo } from "@/lib/streak";

export default function StreakWidget({ streak }: { streak: StreakInfo }) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
        <div>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">
            🔥 {streak.current}일 연속
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-400">
            {streak.todayDone
              ? "오늘 복용을 모두 마쳤어요!"
              : "하루라도 놓치면 처음부터 다시 시작돼요"}
          </p>
        </div>
      </div>

      {streak.milestone && (
        <div className="rounded-lg bg-black p-4 text-center text-white dark:bg-white dark:text-black">
          🎉 {streak.milestone}일 연속 달성! 정말 대단해요
        </div>
      )}
    </div>
  );
}
