import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, phone, birth_year, gender")
    .eq("id", user.id)
    .single();

  if (profile?.name) {
    redirect("/home");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-black dark:text-zinc-50">
          프로필을 알려주세요
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          가족·친구에게 표시될 이름이에요. 이름 외에는 선택 입력이에요.
        </p>
        <OnboardingForm />
      </div>
    </div>
  );
}
