"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayInSeoul } from "@/lib/schedule";

const DEFAULT_TIME = "08:00";

export default function NewSupplementForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("30");
  const [startDate, setStartDate] = useState(todayInSeoul());
  const [doseTimes, setDoseTimes] = useState<string[]>([DEFAULT_TIME]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function updateDoseCount(count: number) {
    setDoseTimes((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(DEFAULT_TIME);
      while (next.length > count) next.pop();
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?next=/supplements/new");
      return;
    }

    const { error } = await supabase.from("supplements").insert({
      user_id: user.id,
      name,
      dose_times_per_day: doseTimes.length,
      total_quantity: Number(totalQuantity),
      start_date: startDate,
      dose_times: [...doseTimes].sort(),
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        required
        placeholder="영양제 이름 (예: 비타민D)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white"
      />

      <label className="text-sm text-zinc-600 dark:text-zinc-400">
        총 수량
      </label>
      <input
        type="number"
        required
        min={1}
        value={totalQuantity}
        onChange={(e) => setTotalQuantity(e.target.value)}
        className="rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white"
      />

      <label className="text-sm text-zinc-600 dark:text-zinc-400">
        복용 시작일
      </label>
      <input
        type="date"
        required
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white"
      />

      <label className="text-sm text-zinc-600 dark:text-zinc-400">
        하루 복용 횟수
      </label>
      <select
        value={doseTimes.length}
        onChange={(e) => updateDoseCount(Number(e.target.value))}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white"
      >
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>
            {n}회
          </option>
        ))}
      </select>

      <label className="text-sm text-zinc-600 dark:text-zinc-400">
        복용 시간
      </label>
      <div className="flex flex-col gap-2">
        {doseTimes.map((t, i) => (
          <input
            key={i}
            type="time"
            required
            value={t}
            onChange={(e) => {
              const next = [...doseTimes];
              next[i] = e.target.value;
              setDoseTimes(next);
            }}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white"
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-2 rounded-full bg-foreground px-5 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {status === "saving" ? "저장 중..." : "등록하기"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
