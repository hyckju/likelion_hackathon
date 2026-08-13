import type { SupabaseClient } from "@supabase/supabase-js";
import {
  todayInSeoul,
  addDaysToDateString,
  seoulDateStringOf,
} from "./schedule";

export type DayReport = {
  date: string;
  expected: number;
  completed: number;
  missed: boolean;
};

export type WeeklyReport = {
  days: DayReport[];
  adherenceRate: number;
  missedDates: string[];
  totalExpected: number;
  totalCompleted: number;
};

// 최근 7일(오늘 포함)의 복용률/놓친 날짜를 계산한다. streak.ts와 같은
// 이유로, 실제 schedules 행이 아니라 "기대 복용 횟수"를 기준으로 삼는다.
// 오늘은 하루가 끝나지 않았으니 "놓쳤다"고 단정하지 않는다.
export async function getWeeklyReport(
  supabase: SupabaseClient,
  userId: string,
): Promise<WeeklyReport> {
  const { data: supplements } = await supabase
    .from("supplements")
    .select("id, start_date, dose_times_per_day")
    .eq("user_id", userId);

  const activeSupplements = supplements ?? [];
  const today = todayInSeoul();
  const weekStart = addDaysToDateString(today, -6);

  const completedCountByDate = new Map<string, number>();
  if (activeSupplements.length > 0) {
    const { data: completed } = await supabase
      .from("schedules")
      .select("scheduled_time")
      .in(
        "supplement_id",
        activeSupplements.map((s) => s.id),
      )
      .eq("status", "completed")
      .gte("scheduled_time", `${weekStart}T00:00:00+09:00`);

    for (const row of completed ?? []) {
      const date = seoulDateStringOf(row.scheduled_time);
      completedCountByDate.set(date, (completedCountByDate.get(date) ?? 0) + 1);
    }
  }

  const days: DayReport[] = [];
  let cursor = weekStart;
  while (cursor <= today) {
    const expected = activeSupplements
      .filter((s) => s.start_date <= cursor)
      .reduce((sum, s) => sum + s.dose_times_per_day, 0);
    const completed = completedCountByDate.get(cursor) ?? 0;
    days.push({
      date: cursor,
      expected,
      completed,
      missed: expected > 0 && completed < expected && cursor < today,
    });
    cursor = addDaysToDateString(cursor, 1);
  }

  const totalExpected = days.reduce((sum, d) => sum + d.expected, 0);
  const totalCompleted = days.reduce(
    (sum, d) => sum + Math.min(d.completed, d.expected),
    0,
  );
  const adherenceRate =
    totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;
  const missedDates = days.filter((d) => d.missed).map((d) => d.date);

  return { days, adherenceRate, missedDates, totalExpected, totalCompleted };
}
