"use client";

import type {ShortUrl} from "@/lib/urls";
import UrlRow from "@/components/dashboard/UrlRow";

interface UrlTableProps {
  urls: ShortUrl[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;

  onEdit: (url: ShortUrl) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  onCopy: (shortCode: string) => void;
  onViewAnalytics: (id: string) => void;
  onLoadMore: () => void;
}

type Column = {label: string, align?: string};

const COLUMNS: Column[] = [
  {label: "Short Link"},
  {label: "Destination"},
  {label: "Created"},
  {label: "Status"},
  {label: "Clicks"},
  {label: "Actions", align: "text-right"},
];

function TableSkeleton() {
  return (
    <section className="border border-outline bg-surface">
      <div className="px-6 py-4 flex items-center gap-3 border-b border-outline bg-surface-bright">
        <div className="w-2 h-2 bg-outline animate-pulse" />
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-on-background">Your Links</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline">
              {COLUMNS.map((c) => (
                <th key={c.label} className="py-4 px-6 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant font-normal">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(4)].map((_, i) => (
              <tr key={i} className="border-b border-outline">
                <td className="py-4 px-6"><div className="h-4 w-24 bg-surface-bright border border-outline" /></td>
                <td className="py-4 px-6"><div className="h-4 w-48 bg-surface-bright border border-outline" /></td>
                <td className="py-4 px-6"><div className="h-4 w-20 bg-surface-bright border border-outline" /></td>
                <td className="py-4 px-6"><div className="h-5 w-16 bg-surface-bright border border-outline" /></td>
                <td className="py-4 px-6"><div className="h-5 w-16 bg-surface-bright border border-outline" /></td>
                <td className="py-4 px-6"><div className="flex justify-end gap-2">
                  {[...Array(4)].map((_, j) => <div key={j} className="h-7 w-7 bg-surface-bright border border-outline" />)}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function UrlTable({
  urls,
  isLoading,
  hasMore,
  isLoadingMore,
  onEdit,
  onDelete,
  onToggleActive,
  onCopy,
  onViewAnalytics,
  onLoadMore,
}: UrlTableProps) {

  if (isLoading) return <TableSkeleton />;

  if (urls.length === 0) {
    return (
      <section className="border border-outline bg-surface">
        <div className="px-6 py-4 flex items-center gap-3 border-b border-outline bg-surface-bright">
          <div className="w-2 h-2 bg-error animate-pulse" />
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-on-background">Your Links</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-background animate-fade-in">
          <p className="font-display font-bold text-xl text-on-background uppercase tracking-widest">No links yet</p>
          <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">Create your first short link to get started.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="border border-outline bg-surface animate-fade-in">
      <div className="px-6 py-4 flex justify-between items-center border-b border-outline bg-surface-bright">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-on-background flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-primary" />
          Your Links
        </h2>
        <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
          {urls.length} {urls.length === 1 ? "link" : "links"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline bg-surface-bright">
              {COLUMNS.map((col) => (
                <th
                  key={col.label}
                  className={`py-4 px-6 font-mono text-[10px] uppercase tracking-widest font-normal ${col.align === "text-right" ? "text-right" : "text-left"}`}
                >
                  <span className={`flex items-center gap-1.5 text-on-surface-variant ${col.align === "text-right" ? "justify-end" : ""}`}>
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-background">
            {urls.map((url) => (
              <UrlRow
                key={url.id}
                url={url}
                onEdit={onEdit}
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
        <div className="px-6 py-4 flex justify-between items-center font-mono text-[10px] uppercase tracking-widest border-t border-outline bg-surface-bright text-on-surface-variant">
          <span>{urls.length} loaded</span>
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-3 px-5 py-2 border border-outline hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <span className="w-3 h-3 border border-t-primary animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </section>
  );
}
