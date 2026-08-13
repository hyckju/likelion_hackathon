import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInSeoul } from "./schedule";
import { getAcceptedConnections } from "./connections";

function seoulDayBoundsISO(dateStr: string) {
  return {
    start: new Date(`${dateStr}T00:00:00+09:00`).toISOString(),
    end: new Date(`${dateStr}T23:59:59+09:00`).toISOString(),
  };
}

export type ReactionPrompt = {
  scheduleId: string;
  supplementName: string;
  ownerName: string;
};

// 내 연결들이 오늘 완료한 일정 중, 내가 아직 리액션을 안 보낸 것들.
export async function getPendingReactionPrompts(
  supabase: SupabaseClient,
  myUserId: string,
): Promise<ReactionPrompt[]> {
  const connections = await getAcceptedConnections(supabase, myUserId);
  if (connections.length === 0) return [];

  const otherIds = connections.map((c) => c.otherId);
  const { data: theirSupplements } = await supabase
    .from("supplements")
    .select("id, name, user_id")
    .in("user_id", otherIds);

  if (!theirSupplements || theirSupplements.length === 0) return [];

  const { start, end } = seoulDayBoundsISO(todayInSeoul());
  const { data: completedSchedules } = await supabase
    .from("schedules")
    .select("id, supplement_id")
    .in(
      "supplement_id",
      theirSupplements.map((s) => s.id),
    )
    .eq("status", "completed")
    .gte("scheduled_time", start)
    .lte("scheduled_time", end);

  if (!completedSchedules || completedSchedules.length === 0) return [];

  const { data: myReactions } = await supabase
    .from("reactions")
    .select("schedule_id")
    .eq("sender_id", myUserId)
    .in(
      "schedule_id",
      completedSchedules.map((s) => s.id),
    );

  const alreadyReacted = new Set(
    (myReactions ?? []).map((r) => r.schedule_id),
  );

  const supplementById = new Map(theirSupplements.map((s) => [s.id, s]));
  const { data: theirProfiles } = await supabase
    .from("users")
    .select("id, name")
    .in("id", otherIds);
  const nameById = new Map((theirProfiles ?? []).map((u) => [u.id, u.name]));

  return completedSchedules
    .filter((s) => !alreadyReacted.has(s.id))
    .map((s) => {
      const supplement = supplementById.get(s.supplement_id);
      return {
        scheduleId: s.id,
        supplementName: supplement?.name ?? "",
        ownerName: nameById.get(supplement?.user_id ?? "") ?? "",
      };
    });
}

export type ReceivedReaction = {
  id: string;
  emojiOrText: string;
  senderName: string;
  supplementName: string;
  sentAt: string;
};

// 오늘 내가 완료한 일정에, 남들이 보내준 리액션.
export async function getReceivedReactionsToday(
  supabase: SupabaseClient,
  myUserId: string,
): Promise<ReceivedReaction[]> {
  const { start, end } = seoulDayBoundsISO(todayInSeoul());

  const { data: mySupplements } = await supabase
    .from("supplements")
    .select("id, name")
    .eq("user_id", myUserId);

  if (!mySupplements || mySupplements.length === 0) return [];

  const { data: mySchedulesToday } = await supabase
    .from("schedules")
    .select("id, supplement_id")
    .in(
      "supplement_id",
      mySupplements.map((s) => s.id),
    )
    .gte("scheduled_time", start)
    .lte("scheduled_time", end);

  if (!mySchedulesToday || mySchedulesToday.length === 0) return [];

  const { data: reactions } = await supabase
    .from("reactions")
    .select("id, emoji_or_text, sent_at, sender_id, schedule_id")
    .in(
      "schedule_id",
      mySchedulesToday.map((s) => s.id),
    )
    .order("sent_at", { ascending: false });

  if (!reactions || reactions.length === 0) return [];

  const senderIds = [...new Set(reactions.map((r) => r.sender_id))];
  const { data: senders } = await supabase
    .from("users")
    .select("id, name")
    .in("id", senderIds);
  const nameById = new Map((senders ?? []).map((u) => [u.id, u.name]));

  const supplementIdByScheduleId = new Map(
    mySchedulesToday.map((s) => [s.id, s.supplement_id]),
  );
  const supplementNameById = new Map(mySupplements.map((s) => [s.id, s.name]));

  return reactions.map((r) => ({
    id: r.id,
    emojiOrText: r.emoji_or_text,
    senderName: nameById.get(r.sender_id) ?? "누군가",
    supplementName:
      supplementNameById.get(
        supplementIdByScheduleId.get(r.schedule_id) ?? "",
      ) ?? "",
    sentAt: r.sent_at,
  }));
}
