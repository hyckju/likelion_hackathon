import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewSupplementForm from "./NewSupplementForm";

export default async function NewSupplementPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/supplements/new");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-black dark:text-zinc-50">
          영양제 등록
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          이름, 하루 복용 횟수, 시간을 입력해주세요.
        </p>
        <NewSupplementForm />
      </div>
    </div>
  );
}
