import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-4 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
          먹(MEOK)
        </h1>
        <p className="max-w-xs text-base text-zinc-600 dark:text-zinc-400">
          가족·지인과 함께 챙기는 영양제 습관 형성 앱
        </p>
        <Link
          href="/login"
          className="mt-2 rounded-full bg-foreground px-6 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          로그인
        </Link>
      </main>
    </div>
  );
}
