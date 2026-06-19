"use client";

import type {ShortUrl} from "@/lib/urls";
import Button from "@/components/ui/Button";

interface UrlRowProps {
  url: ShortUrl;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onCopy: (shortCode: string) => void;
  onViewAnalytics: (id: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function UrlRow({url, onDelete, onToggleActive, onCopy, onViewAnalytics}: UrlRowProps) {
  const slug = url.customSlug ?? url.shortCode;
  const shortHref = `${process.env.NEXT_PUBLIC_API_URL}/${slug}`;
  const isExpired = url.expiresAt !== null && new Date(url.expiresAt) < new Date();

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this link? This cannot be undone.")) {
      onDelete(url.id);
    }
  };

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      {/* Short URL */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          {url.isPasswordProtected && <span title="Password protected">🔒</span>}
          <a
            href={shortHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            {slug}
          </a>
        </div>
      </td>

      {/* Original URL */}
      <td className="px-4 py-3 max-w-xs">
        <span
          title={url.originalUrl}
          className="text-sm text-white/60"
        >
          {truncate(url.originalUrl, 40)}
        </span>
      </td>

      {/* Created date */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-white/50">
        {formatDate(url.createdAt)}
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              url.isActive
                ? "bg-green-500/15 text-green-400 ring-1 ring-green-500/30"
                : "bg-white/10 text-white/40 ring-1 ring-white/10"
            }`}
          >
            {url.isActive ? "Active" : "Inactive"}
          </span>
          {isExpired && (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-500/15 text-red-400 ring-1 ring-red-500/30">
              Expired
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="px-2.5! py-1! text-xs!"
            onClick={() => onCopy(slug)}
          >
            Copy
          </Button>
          <Button
            variant="ghost"
            className="px-2.5! py-1! text-xs!"
            onClick={() => onViewAnalytics(url.id)}
          >
            Analytics
          </Button>
          <Button
            variant="ghost"
            className="px-2.5! py-1! text-xs!"
            onClick={() => onToggleActive(url.id, !url.isActive)}
          >
            {url.isActive ? "Disable" : "Enable"}
          </Button>
          <Button
            variant="danger"
            className="px-2.5! py-1! text-xs!"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}
