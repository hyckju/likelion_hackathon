import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-black dark:text-zinc-50">
          먹(MEOK) 로그인
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          이메일로 로그인 링크를 보내드릴게요.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
