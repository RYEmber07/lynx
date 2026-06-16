export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 text-center font-sans dark:bg-zinc-950">
      <main className="max-w-md space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Lynx
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          A production-grade URL shortener.
        </p>
      </main>
    </div>
  );
}

