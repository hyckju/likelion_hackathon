"use client";

import { useState } from "react";
import { RELATION_TYPES, type RelationType } from "@/lib/relations";

export default function InviteForm({ inviterId }: { inviterId: string }) {
  const [relationType, setRelationType] = useState<RelationType>("엄마");
  const [copied, setCopied] = useState(false);

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/accept?inviter=${inviterId}&type=${encodeURIComponent(relationType)}`
      : "";

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <select
        value={relationType}
        onChange={(e) => setRelationType(e.target.value as RelationType)}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white"
      >
        {RELATION_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <div className="rounded-lg bg-zinc-100 p-4 text-sm break-all text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        {link}
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="rounded-full bg-foreground px-5 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        {copied ? "복사됨!" : "링크 복사하기"}
      </button>
    </div>
  );
}
