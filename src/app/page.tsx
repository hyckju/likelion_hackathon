export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-4 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
          먹(MEOK)
        </h1>
        <p className="max-w-xs text-base text-zinc-600 dark:text-zinc-400">
          가족·지인과 함께 챙기는 영양제 습관 형성 앱
        </p>
      </main>
    </div>
  );
}
