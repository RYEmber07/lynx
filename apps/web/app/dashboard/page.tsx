"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUrls } from "@/hooks/useUrls";
import UrlModal from "@/components/dashboard/UrlModal";
import UrlTable from "@/components/dashboard/UrlTable";
import Toast from "@/components/ui/Toast";
import { copyToClipboard } from "@/lib/urls";
import type { ShortUrl } from "@/lib/urls";

type ToastState = { message: string; type: "success" | "error" } | null;

export default function DashboardPage() {
  const router = useRouter();
  const {
    urls,
    isLoading,
    isLoadingMore,
    hasMore,
    error: urlsError,
    addUrl,
    replaceUrl,
    handleDelete,
    handleToggleActive,
    reload,
    loadMore,
  } = useUrls();

  const [toast, setToast] = useState<ToastState>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState<ShortUrl | undefined>(undefined);

  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  const openCreate = () => {
    setEditingUrl(undefined);
    setModalOpen(true);
  };

  const openEdit = (url: ShortUrl) => {
    setEditingUrl(url);
    setModalOpen(true);
  };

  const onCreated = (url: ShortUrl) => {
    addUrl(url);
    showToast("Link created", "success");
  };

  const onUpdated = (url: ShortUrl) => {
    replaceUrl(url);
    showToast("Link updated", "success");
  };

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
      showToast("Failed to copy link", "error");
    }
  };

  const onViewAnalytics = (id: string) => {
    router.push(`/dashboard/analytics/${id}`);
  };

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-outline p-8 md:p-12 flex flex-col md:flex-row justify-between items-end gap-6 bg-surface">
        <div>
          <h1 className="font-display font-bold text-4xl mb-2">Your Links</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
            Create, manage, and track your short links.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-12 px-8 bg-primary text-on-primary font-bold font-mono text-[11px] uppercase tracking-widest hover:bg-primary-container active:scale-[0.98] transition-all flex items-center gap-3 shrink-0"
        >
          <span className="text-lg leading-none">+</span> Create Short Link
        </button>
      </div>

      {/* URL fetch error */}
      {urlsError && !isLoading && (
        <div className="m-8 p-4 border border-error/30 bg-error/10 text-error font-mono text-xs flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-error shrink-0" />
            Failed to load links: {urlsError}
          </div>
          <button
            onClick={reload}
            className="font-mono text-[10px] uppercase tracking-widest border border-error/30 px-4 py-2 hover:bg-error/10 transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Link Table */}
      <section className="grow">
        <UrlTable
          urls={urls}
          isLoading={isLoading}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onEdit={openEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
          onCopy={onCopy}
          onViewAnalytics={onViewAnalytics}
          onLoadMore={loadMore}
        />
      </section>

      {/* ── Modals ── */}
      {modalOpen && (
        <UrlModal
          onClose={() => setModalOpen(false)}
          editUrl={editingUrl}
          onCreated={onCreated}
          onUpdated={onUpdated}
          onError={(msg) => showToast(msg, "error")}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
}
