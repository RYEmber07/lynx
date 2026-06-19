"use client";

import type {ShortUrl} from "@/lib/urls";
import UrlRow from "@/components/dashboard/UrlRow";

interface UrlTableProps {
  urls: ShortUrl[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onCopy: (shortCode: string) => void;
  onViewAnalytics: (id: string) => void;
  onLoadMore: () => void;
}

const HEADERS = ["Short Link", "Original URL", "Created", "Status", "Actions"];

export default function UrlTable({
  urls,
  isLoading,
  hasMore,
  isLoadingMore,
  onDelete,
  onToggleActive,
  onCopy,
  onViewAnalytics,
  onLoadMore,
}: UrlTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <span className="w-8 h-8 rounded-full border-2 border-white/20 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (urls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/40">
        <span className="text-4xl">🔗</span>
        <p className="text-sm">No links yet. Create your first one above.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {HEADERS.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/40"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {urls.map((url) => (
              <UrlRow
                key={url.id}
                url={url}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
                onCopy={onCopy}
                onViewAnalytics={onViewAnalytics}
              />
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-6 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoadingMore ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                Loading…
              </span>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
