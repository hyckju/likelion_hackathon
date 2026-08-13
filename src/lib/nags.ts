import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInSeoul } from "./schedule";
import type { RelationType } from "./relations";

// relation_type은 "그 관계에서 이 두 사람이 쓰는 톤"으로 단순화해서 쓴다.
// (예: 딸이 엄마를 초대해 relation_type='엄마'가 저장되면, 이 관계 안에서
// 오가는 잔소리는 방향에 상관없이 '엄마 톤' 템플릿을 쓴다.)
const NAG_TEMPLATES: Record<RelationType, (name: string) => string> = {
  엄마: (name) => `${name}아, 영양제 먹을 시간 한참 지났어! 얼른 챙겨 먹어~`,
  아빠: (name) => `${name}야, 영양제 챙겨 먹었니? 시간 지났다.`,
  딸: (name) => `${name}, 영양제 드실 시간 지났어요. 잊지 말고 챙겨 드세요!`,
  아들: (name) => `${name}, 영양제 드실 시간 지났어요. 잊지 말고 챙겨 드세요!`,
  친구: (name) => `야 ${name}! 영양제 아직 안 먹었지? 빨리 먹어 ㅋㅋ`,
};

const MAX_NAGS_PER_DAY = 3;
const MIN_NAG_INTERVAL_MS = 60 * 60 * 1000;
const OVERDUE_MINUTES = 60;

function seoulDayStartISO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00+09:00`).toISOString();
}

// 내 연결(가족/친구)들의 미인증 일정 중 예정 시간 + 60분이 지난 것을 찾아
// 잔소리(nags) 행을 만든다. 하루 최대 3회, 최소 1시간 간격으로 제한한다.
// 크론 없이 각자 홈 화면을 열 때마다 "내가 상대에게" 보내는 몫을 생성하는
// 구조라, 상대가 이 함수를 실행할 때(=본인 홈 화면 접속 시)만 잔소리가
// 쌓인다는 한계가 있다 (schedule.ts의 ensureTodaysSchedules와 동일한 절충).
export async function generateNagsForMyConnections(
  supabase: SupabaseClient,
  myUserId: string,
) {
  const [{ data: asInviter }, { data: asPartner }] = await Promise.all([
    supabase
      .from("relationships")
      .select("partner_id, relation_type")
      .eq("user_id", myUserId)
      .eq("status", "accepted"),
    supabase
      .from("relationships")
      .select("user_id, relation_type")
      .eq("partner_id", myUserId)
      .eq("status", "accepted"),
  ]);

  const connections = [
    ...(asInviter ?? []).map((r) => ({
      otherId: r.partner_id as string,
      relationType: r.relation_type as RelationType,
    })),
    ...(asPartner ?? []).map((r) => ({
      otherId: r.user_id as string,
      relationType: r.relation_type as RelationType,
    })),
  ];

  if (connections.length === 0) return;

  const otherIds = connections.map((c) => c.otherId);
  const relationByOther = new Map(
    connections.map((c) => [c.otherId, c.relationType]),
  );

  const { data: theirSupplements } = await supabase
    .from("supplements")
    .select("id, user_id")
    .in("user_id", otherIds);

  if (!theirSupplements || theirSupplements.length === 0) return;

  const ownerBySupplementId = new Map(
    theirSupplements.map((s) => [s.id, s.user_id as string]),
  );

  const cutoff = new Date(Date.now() - OVERDUE_MINUTES * 60_000).toISOString();
  const { data: overdueSchedules } = await supabase
    .from("schedules")
    .select("id, supplement_id")
    .in(
      "supplement_id",
      theirSupplements.map((s) => s.id),
    )
    .eq("status", "pending")
    .lte("scheduled_time", cutoff);

  if (!overdueSchedules || overdueSchedules.length === 0) return;

  const scheduleIds = overdueSchedules.map((s) => s.id);
  const dayStart = seoulDayStartISO(todayInSeoul());

  const { data: recentNags } = await supabase
    .from("nags")
    .select("schedule_id, sent_at")
    .eq("sender_id", myUserId)
    .in("schedule_id", scheduleIds)
    .order("sent_at", { ascending: false });

  const historyBySchedule = new Map<string, { sent_at: string }[]>();
  for (const nag of recentNags ?? []) {
    const list = historyBySchedule.get(nag.schedule_id) ?? [];
    list.push(nag);
    historyBySchedule.set(nag.schedule_id, list);
  }

  const { data: theirProfiles } = await supabase
    .from("users")
    .select("id, name")
    .in("id", otherIds);
  const nameById = new Map((theirProfiles ?? []).map((u) => [u.id, u.name]));

  const toInsert: {
    schedule_id: string;
    sender_id: string;
    receiver_id: string;
    message: string;
  }[] = [];

  for (const sched of overdueSchedules) {
    const ownerId = ownerBySupplementId.get(sched.supplement_id);
    if (!ownerId) continue;
    const relationType = relationByOther.get(ownerId);
    if (!relationType) continue;

    const history = historyBySchedule.get(sched.id) ?? [];
    const nagsToday = history.filter((n) => n.sent_at >= dayStart);
    if (nagsToday.length >= MAX_NAGS_PER_DAY) continue;

    const last = history[0];
    if (
      last &&
      Date.now() - new Date(last.sent_at).getTime() < MIN_NAG_INTERVAL_MS
    ) {
      continue;
    }

    const receiverName = nameById.get(ownerId) ?? "";
    toInsert.push({
      schedule_id: sched.id,
      sender_id: myUserId,
      receiver_id: ownerId,
      message: NAG_TEMPLATES[relationType](receiverName),
    });
  }

  if (toInsert.length > 0) {
    await supabase.from("nags").insert(toInsert);
  }
}

export type ReceivedNag = {
  id: string;
  message: string;
  senderName: string;
  sentAt: string;
};

export async function getTodaysReceivedNags(
  supabase: SupabaseClient,
  myUserId: string,
): Promise<ReceivedNag[]> {
  const dayStart = seoulDayStartISO(todayInSeoul());

  const { data: nags } = await supabase
    .from("nags")
    .select("id, message, sent_at, sender_id")
    .eq("receiver_id", myUserId)
    .gte("sent_at", dayStart)
    .order("sent_at", { ascending: false });

  if (!nags || nags.length === 0) return [];

  const senderIds = [...new Set(nags.map((n) => n.sender_id))];
  const { data: senders } = await supabase
    .from("users")
    .select("id, name")
    .in("id", senderIds);
  const nameById = new Map((senders ?? []).map((u) => [u.id, u.name]));

  return nags.map((n) => ({
    id: n.id,
    message: n.message,
    senderName: nameById.get(n.sender_id) ?? "누군가",
    sentAt: n.sent_at,
  }));
}
