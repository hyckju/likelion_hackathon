"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Phase = "loading" | "camera" | "captured" | "unavailable" | "uploading" | "error";

export default function CameraCapture({
  scheduleId,
  userId,
}: {
  scheduleId: string;
  userId: string;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPhase("camera");
      } catch {
        if (!cancelled) setPhase("unavailable");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setPhase("captured");
      },
      "image/jpeg",
      0.9,
    );
  }

  function retake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setPhase("loading");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPhase("camera");
      })
      .catch(() => setPhase("unavailable"));
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedBlob(file);
    setCapturedUrl(URL.createObjectURL(file));
    setPhase("captured");
  }

  async function confirm() {
    if (!capturedBlob) return;
    setPhase("uploading");
    setErrorMessage("");

    const supabase = createClient();
    const path = `${userId}/${scheduleId}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("verification-photos")
      .upload(path, capturedBlob, { contentType: "image/jpeg" });

    if (uploadError) {
      setErrorMessage(uploadError.message);
      setPhase("error");
      return;
    }

    const { error: insertError } = await supabase
      .from("verification_photos")
      .insert({ schedule_id: scheduleId, photo_url: path });

    if (insertError) {
      setErrorMessage(insertError.message);
      setPhase("error");
      return;
    }

    const { error: updateError } = await supabase
      .from("schedules")
      .update({ status: "completed" })
      .eq("id", scheduleId);

    if (updateError) {
      setErrorMessage(updateError.message);
      setPhase("error");
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg bg-black">
        {phase === "captured" || phase === "uploading" || phase === "error" ? (
          capturedUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedUrl} alt="촬영된 사진" className="w-full" />
          )
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {phase === "loading" && (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          카메라를 여는 중...
        </p>
      )}

      {phase === "camera" && (
        <button
          type="button"
          onClick={capture}
          className="rounded-full bg-foreground px-5 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          촬영하기
        </button>
      )}

      {phase === "unavailable" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            카메라에 접근할 수 없어요. 사진을 직접 선택해주세요.
          </p>
          <label className="cursor-pointer rounded-full border border-zinc-300 px-5 py-3 text-center text-base font-medium text-black dark:border-zinc-700 dark:text-zinc-50">
            사진 선택하기
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      )}

      {(phase === "captured" || phase === "error") && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={retake}
            className="flex-1 rounded-full border border-zinc-300 px-5 py-3 text-base font-medium text-black dark:border-zinc-700 dark:text-zinc-50"
          >
            다시 찍기
          </button>
          <button
            type="button"
            onClick={confirm}
            className="flex-1 rounded-full bg-foreground px-5 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            인증 완료
          </button>
        </div>
      )}

      {phase === "uploading" && (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          업로드 중...
        </p>
      )}

      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
