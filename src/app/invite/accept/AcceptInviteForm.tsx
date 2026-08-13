"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RelationType } from "@/lib/relations";

export default function AcceptInviteForm({
  inviterId,
  relationType,
}: {
  inviterId: string;
  relationType: RelationType;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAccept() {
    setStatus("saving");
    setErrorMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("relationships").insert({
      user_id: inviterId,
      partner_id: user.id,
      relation_type: relationType,
      status: "accepted",
    });

    if (error) {
      setStatus("error");
      setErrorMessage(
        error.code === "23505"
          ? "이미 연결된 사이예요."
          : error.message,
      );
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleAccept}
        disabled={status === "saving"}
        className="rounded-full bg-foreground px-5 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {status === "saving" ? "연결 중..." : "수락하기"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
