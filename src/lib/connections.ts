import type { SupabaseClient } from "@supabase/supabase-js";
import type { RelationType } from "./relations";

export type Connection = {
  otherId: string;
  relationType: RelationType;
  // "inviter": 내가 초대했고, relationType은 "상대가 나에게 무엇인지"
  // "partner": 내가 초대받았고, relationType은 "내가 상대에게 무엇인지"
  perspective: "inviter" | "partner";
};

export async function getAcceptedConnections(
  supabase: SupabaseClient,
  myUserId: string,
): Promise<Connection[]> {
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

  return [
    ...(asInviter ?? []).map((r) => ({
      otherId: r.partner_id as string,
      relationType: r.relation_type as RelationType,
      perspective: "inviter" as const,
    })),
    ...(asPartner ?? []).map((r) => ({
      otherId: r.user_id as string,
      relationType: r.relation_type as RelationType,
      perspective: "partner" as const,
    })),
  ];
}
