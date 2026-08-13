"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?next=/onboarding");
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({
        name,
        phone: phone || null,
        birth_year: birthYear ? Number(birthYear) : null,
        gender: gender || null,
      })
      .eq("id", user.id);

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
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white"
      />
      <input
        type="tel"
        placeholder="전화번호 (선택)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white"
      />
      <input
        type="number"
        placeholder="출생연도 (선택)"
        value={birthYear}
        onChange={(e) => setBirthYear(e.target.value)}
        className="rounded-lg border border-zinc-300 px-4 py-3 text-base outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white"
      />
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white"
      >
        <option value="">성별 (선택)</option>
        <option value="여성">여성</option>
        <option value="남성">남성</option>
        <option value="기타">기타</option>
      </select>
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-full bg-foreground px-5 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {status === "saving" ? "저장 중..." : "시작하기"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
