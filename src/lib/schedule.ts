import type { SupabaseClient } from "@supabase/supabase-js";

// 해커톤 MVP는 한국 사용자만 대상으로 하므로, 일반적인 타임존 처리 대신
// 한국이 DST를 쓰지 않는다는 점을 이용해 고정 +09:00 오프셋으로 계산한다.
const SEOUL_OFFSET = "+09:00";

export function todayInSeoul(): string {
  const now = new Date();
  const seoulNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return seoulNow.toISOString().slice(0, 10);
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function seoulDateStringOf(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const seoul = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return seoul.toISOString().slice(0, 10);
}

function scheduledTimeISO(dateStr: string, timeStr: string): string {
  // timeStr: "HH:MM" or "HH:MM:SS" (Postgres time 컬럼에서 옴)
  const hhmm = timeStr.slice(0, 5);
  return new Date(`${dateStr}T${hhmm}:00${SEOUL_OFFSET}`).toISOString();
}

export type TodaySchedule = {
  id: string;
  supplementId: string;
  supplementName: string;
  scheduledTime: string;
  status: "pending" | "completed" | "missed";
};

// 오늘 날짜 기준으로, 아직 생성되지 않은 schedule 행을 만들고
// 오늘의 전체 일정을 시간순으로 반환한다. (크론 없이 홈 진입 시점에 보충)
export async function ensureTodaysSchedules(
  supabase: SupabaseClient,
  userId: string,
): Promise<TodaySchedule[]> {
  const today = todayInSeoul();
  const dayStart = scheduledTimeISO(today, "00:00");
  const dayEnd = scheduledTimeISO(today, "23:59");

  const { data: supplements } = await supabase
    .from("supplements")
    .select("id, name, dose_times")
    .eq("user_id", userId);

  if (!supplements || supplements.length === 0) return [];

  const { data: existing } = await supabase
    .from("schedules")
    .select("id, supplement_id, scheduled_time, status")
    .in(
      "supplement_id",
      supplements.map((s) => s.id),
    )
    .gte("scheduled_time", dayStart)
    .lte("scheduled_time", dayEnd);

  const existingTimesBySupplement = new Map<string, Set<string>>();
  for (const row of existing ?? []) {
    const set = existingTimesBySupplement.get(row.supplement_id) ?? new Set();
    set.add(row.scheduled_time);
    existingTimesBySupplement.set(row.supplement_id, set);
  }

  const toInsert: { supplement_id: string; scheduled_time: string }[] = [];
  for (const supplement of supplements) {
    const already = existingTimesBySupplement.get(supplement.id) ?? new Set();
    for (const doseTime of supplement.dose_times ?? []) {
      const iso = scheduledTimeISO(today, doseTime);
      if (!already.has(iso)) {
        toInsert.push({ supplement_id: supplement.id, scheduled_time: iso });
      }
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("schedules").insert(toInsert);
  }

  const { data: finalSchedules } = await supabase
    .from("schedules")
    .select("id, supplement_id, scheduled_time, status")
    .in(
      "supplement_id",
      supplements.map((s) => s.id),
    )
    .gte("scheduled_time", dayStart)
    .lte("scheduled_time", dayEnd)
    .order("scheduled_time", { ascending: true });

  const nameBySupplementId = new Map(supplements.map((s) => [s.id, s.name]));

  return (finalSchedules ?? []).map((row) => ({
    id: row.id,
    supplementId: row.supplement_id,
    supplementName: nameBySupplementId.get(row.supplement_id) ?? "",
    scheduledTime: row.scheduled_time,
    status: row.status,
  }));
}
