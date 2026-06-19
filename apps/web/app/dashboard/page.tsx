"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/lib/auth";
import {useUrls} from "@/hooks/useUrls";
import CreateUrlForm from "@/components/dashboard/CreateUrlForm";
import UrlTable from "@/components/dashboard/UrlTable";
import Toast from "@/components/ui/Toast";
import {copyToClipboard} from "@/lib/urls";
import type {ShortUrl} from "@/lib/urls";

type ToastState = {message: string; type: "success" | "error"} | null;

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const {
    urls,
    isLoading,
    isLoadingMore,
    hasMore,
    handleCreate,
    handleDelete,
    handleToggleActive,
    loadMore,
  } = useUrls();

  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({message, type});
  };

  // Auth guard
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!auth.user) {
    router.replace("/login");
    return null;
  }

  // Callbacks
  const onCreated = async (url: ShortUrl) => {
    try {
      await handleCreate(url as Parameters<typeof handleCreate>[0]);
      showToast("Link created successfully", "success");
    } catch {
      showToast("Failed to create link", "error");
    }
  };

  const onError = (message: string) => showToast(message, "error");

  const onDelete = async (id: string) => {
    try {
      await handleDelete(id);
      showToast("Link deleted", "success");
    } catch {
      showToast("Failed to delete link", "error");
    }
  };

  const onToggleActive = async (id: string, isActive: boolean) => {
    try {
      await handleToggleActive(id, isActive);
      showToast("Link updated", "success");
    } catch {
      showToast("Failed to update link", "error");
    }
  };

  const onCopy = async (shortCode: string) => {
    try {
      await copyToClipboard(shortCode);
      showToast("Copied to clipboard", "success");
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  const onViewAnalytics = (id: string) => {
    router.push(`/dashboard/analytics/${id}`);
  };

  // Render
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Navbar */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-white tracking-tight">
          Lynx
        </span>
        <span className="text-sm text-white/50 hidden sm:block">
          {auth.user.email}
        </span>
        <button
          onClick={async () => {
            await auth.logout();
            router.replace("/");
          }}
          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          Logout
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-10 max-w-5xl mx-auto w-full flex flex-col gap-8">
        <h1 className="text-3xl font-bold text-white">Your Links</h1>

        <CreateUrlForm onCreated={onCreated} onError={onError} />

        <UrlTable
          urls={urls}
          isLoading={isLoading}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
          onCopy={onCopy}
          onViewAnalytics={onViewAnalytics}
          onLoadMore={loadMore}
        />
      </main>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
