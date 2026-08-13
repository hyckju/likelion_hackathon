import type { SupabaseClient } from "@supabase/supabase-js";

export type SupplementInventory = {
  id: string;
  name: string;
  totalQuantity: number;
  dosePerDay: number;
  completedCount: number;
  remainingQuantity: number;
  daysRemaining: number;
  isLow: boolean;
};

const LOW_STOCK_DAYS_THRESHOLD = 3;

// 잔여량 = 총 수량 - 완료된 schedule 수 (1회 복용 = 1정 가정)
export async function getSupplementInventory(
  supabase: SupabaseClient,
  userId: string,
): Promise<SupplementInventory[]> {
  const { data: supplements } = await supabase
    .from("supplements")
    .select("id, name, total_quantity, dose_times_per_day")
    .eq("user_id", userId);

  if (!supplements || supplements.length === 0) return [];

  const { data: completedSchedules } = await supabase
    .from("schedules")
    .select("supplement_id")
    .in(
      "supplement_id",
      supplements.map((s) => s.id),
    )
    .eq("status", "completed");

  const completedCountBySupplement = new Map<string, number>();
  for (const row of completedSchedules ?? []) {
    completedCountBySupplement.set(
      row.supplement_id,
      (completedCountBySupplement.get(row.supplement_id) ?? 0) + 1,
    );
  }

  return supplements.map((s) => {
    const completedCount = completedCountBySupplement.get(s.id) ?? 0;
    const remainingQuantity = Math.max(s.total_quantity - completedCount, 0);
    const daysRemaining =
      s.dose_times_per_day > 0
        ? Math.floor(remainingQuantity / s.dose_times_per_day)
        : remainingQuantity;

    return {
      id: s.id,
      name: s.name,
      totalQuantity: s.total_quantity,
      dosePerDay: s.dose_times_per_day,
      completedCount,
      remainingQuantity,
      daysRemaining,
      isLow: daysRemaining <= LOW_STOCK_DAYS_THRESHOLD,
    };
  });
}

// MVP 범위: 실제 제품 링크 연동 없이, 이름으로 검색하는 하드코딩된
// 쇼핑몰 검색 링크로 대체한다.
export function repurchaseLink(name: string): string {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(name)}`;
}
