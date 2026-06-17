"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && auth.user === null && !auth.error) {
      router.replace("/login");
    }
  }, [auth.isLoading, auth.user, auth.error, router]);

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-xl border border-red-900/50 bg-red-900/20 p-6 text-red-200">
          <h2 className="text-xl font-bold mb-2 text-white">Rate Limited</h2>
          <p>{auth.error}</p>
        </div>
      </div>
    );
  }

  if (auth.user === null) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-white tracking-tight">Lynx</span>
        <button
          onClick={async () => {
            await auth.logout();
          }}
          className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors"
        >
          Log out
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-10 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back, {auth.user.name ?? auth.user.email}
        </h1>
        <p className="text-sm text-gray-500 mb-10">Manage your short links below.</p>

        <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-12 text-center text-gray-500 text-sm">
          Your links will appear here.
        </div>
      </main>
    </div>
  );
}
