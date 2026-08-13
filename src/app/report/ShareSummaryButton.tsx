"use client";

import { useState } from "react";

export default function ShareSummaryButton({
  summaryText,
}: {
  summaryText: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (navigator.share) {
      try {
        await navigator.share({ text: summaryText });
        return;
      } catch {
        // 공유 취소/실패 시 복사로 대체
      }
    }
    await navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full rounded-full bg-foreground px-5 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
    >
      {copied ? "복사됨!" : "가족·친구에게 요약 공유하기"}
    </button>
  );
}
