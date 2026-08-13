"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ReactionPrompt } from "@/lib/reactions";

const QUICK_EMOJIS = ["👍", "❤️", "🎉", "😊"];

export default function ReactionPrompts({
  prompts,
}: {
  prompts: ReactionPrompt[];
}) {
  const router = useRouter();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  async function sendReaction(scheduleId: string, emojiOrText: string) {
    setSendingId(scheduleId);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    await supabase.from("reactions").insert({
      schedule_id: scheduleId,
      sender_id: user.id,
      emoji_or_text: emojiOrText,
    });

    setSendingId(null);
    setSentIds((prev) => new Set(prev).add(scheduleId));
    router.refresh();
  }

  const visible = prompts.filter((p) => !sentIds.has(p.scheduleId));
  if (visible.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-3">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        오늘 완료 소식
      </h2>
      <ul className="flex flex-col gap-2">
        {visible.map((p) => (
          <li
            key={p.scheduleId}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <p className="font-medium text-black dark:text-zinc-50">
              {p.ownerName}님이 {p.supplementName}을(를) 복용했어요!
            </p>
            <div className="mt-2 flex gap-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={sendingId === p.scheduleId}
                  onClick={() => sendReaction(p.scheduleId, emoji)}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-lg hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
