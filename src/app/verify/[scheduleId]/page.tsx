import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CameraCapture from "./CameraCapture";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/verify/${scheduleId}`);
  }

  const { data: schedule } = await supabase
    .from("schedules")
    .select("id, status, supplement:supplements(name, user_id)")
    .eq("id", scheduleId)
    .single();

  if (!schedule) {
    notFound();
  }

  const supplement = Array.isArray(schedule.supplement)
    ? schedule.supplement[0]
    : schedule.supplement;

  if (!supplement || supplement.user_id !== user.id) {
    notFound();
  }

  if (schedule.status !== "pending") {
    redirect("/home");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-black dark:text-zinc-50">
          {supplement.name} 복용 인증
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          먹는 모습을 사진으로 찍어주세요.
        </p>
        <CameraCapture scheduleId={scheduleId} userId={user.id} />
      </div>
    </div>
  );
}
