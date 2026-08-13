import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SupplementsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/supplements");
  }

  const { data: supplements } = await supabase
    .from("supplements")
    .select("id, name, dose_times_per_day, total_quantity, start_date, dose_times")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
            내 영양제
          </h1>
          <Link
            href="/supplements/new"
            className="text-sm font-medium text-black underline dark:text-zinc-50"
          >
            + 추가
          </Link>
        </div>

        {!supplements || supplements.length === 0 ? (
          <p className="rounded-lg bg-zinc-100 p-4 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            아직 등록된 영양제가 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {supplements.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <p className="font-medium text-black dark:text-zinc-50">
                  {s.name}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  하루 {s.dose_times_per_day}회 ·{" "}
                  {(s.dose_times ?? [])
                    .map((t: string) => t.slice(0, 5))
                    .join(", ")}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  총 {s.total_quantity}개 · {s.start_date}부터
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
