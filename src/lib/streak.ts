import type { SupabaseClient } from "@supabase/supabase-js";
import {
  todayInSeoul,
  addDaysToDateString,
  seoulDateStringOf,
} from "./schedule";

export type StreakInfo = {
  current: number;
  todayDone: boolean;
  milestone: 7 | 30 | null;
};

const MILESTONES = [30, 7] as const;

// schedules 행이 실제로 생성돼 있는지와 무관하게, "그 날 기대되는 복용
// 횟수(활성 영양제 dose_times_per_day 합)"와 "완료된 횟수"를 비교해서
// 스트릭을 계산한다. ensureTodaysSchedules가 오늘 것만 만드는 lazy
// 구조라서, 과거 schedules 행 존재 여부로는 결석을 판별할 수 없기 때문.
export async function computeStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<StreakInfo> {
  const { data: supplements } = await supabase
    .from("supplements")
    .select("id, start_date, dose_times_per_day")
    .eq("user_id", userId);

  if (!supplements || supplements.length === 0) {
    return { current: 0, todayDone: false, milestone: null };
  }

  const { data: completed } = await supabase
    .from("schedules")
    .select("supplement_id, scheduled_time")
    .in(
      "supplement_id",
      supplements.map((s) => s.id),
    )
    .eq("status", "completed");

  const completedCountByDate = new Map<string, number>();
  for (const row of completed ?? []) {
    const date = seoulDateStringOf(row.scheduled_time);
    completedCountByDate.set(date, (completedCountByDate.get(date) ?? 0) + 1);
  }

  function expectedDoseCount(dateStr: string): number {
    return supplements!
      .filter((s) => s.start_date <= dateStr)
      .reduce((sum, s) => sum + s.dose_times_per_day, 0);
  }

  const today = todayInSeoul();
  const earliestStart = supplements.reduce(
    (min, s) => (s.start_date < min ? s.start_date : min),
    today,
  );

  let streak = 0;
  let cursor = addDaysToDateString(today, -1);
  while (cursor >= earliestStart) {
    const expected = expectedDoseCount(cursor);
    if (expected === 0) {
      cursor = addDaysToDateString(cursor, -1);
      continue;
    }
    const completedCount = completedCountByDate.get(cursor) ?? 0;
    if (completedCount >= expected) {
      streak++;
      cursor = addDaysToDateString(cursor, -1);
    } else {
      break;
    }
  }

  const todaysExpected = expectedDoseCount(today);
  const todayDone =
    todaysExpected > 0 &&
    (completedCountByDate.get(today) ?? 0) >= todaysExpected;
  if (todayDone) streak++;

  const milestone = MILESTONES.find((m) => streak === m) ?? null;

  return { current: streak, todayDone, milestone };
}
