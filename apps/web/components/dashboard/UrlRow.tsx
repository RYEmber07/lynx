"use client";

import {useState} from "react";
import { Lock, X, Check, Copy, BarChart, Pencil, MinusCircle, PlusCircle, Trash2 } from "lucide-react";
import type {ShortUrl} from "@/lib/urls";

interface UrlRowProps {
  url: ShortUrl;
  onEdit: (url: ShortUrl) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  onCopy: (shortCode: string) => void;
  onViewAnalytics: (id: string) => void;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {month: "short", day: "numeric", year: "numeric"}).format(new Date(iso));
}

function truncate(str: string, len: number) {
  return str.length <= len ? str : str.slice(0, len) + "…";
}

const ICON_BTN = "w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-background hover:bg-surface-variant border border-transparent hover:border-outline transition-all";

export default function UrlRow({url, onEdit, onDelete, onToggleActive, onCopy, onViewAnalytics}: UrlRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isExpired = url.expiresAt ? new Date(url.expiresAt) < new Date() : false;
  const isActive = url.isActive && !isExpired;
  const statusLabel = !url.isActive ? "Inactive" : (isExpired ? "Expired" : "Active");

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(url.id);
  };

  const handleToggle = async () => {
    setIsToggling(true);
    await onToggleActive(url.id, !url.isActive);
    setIsToggling(false);
  };

  return (
    <tr className="group border-b border-outline hover:bg-surface-bright transition-colors">

      {/* Short Link + badges */}
      <td className="py-5 px-6">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-xs text-primary">
            lynx.sh/{url.customSlug ?? url.shortCode}
          </span>
          {url.customSlug && (
            <span className="font-mono text-[9px] text-on-surface-variant/60">
              lynx.sh/{url.shortCode}
            </span>
          )}
          <div className="flex items-center gap-2 flex-wrap min-h-4">
            {url.customSlug && (
              <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant border border-outline px-1.5 py-0.5">
                <span className="w-1 h-1 bg-outline-variant shrink-0" />
                alias
              </span>
            )}
            {url.isPasswordProtected && (
              <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant border border-outline px-1.5 py-0.5">
                <Lock className="w-[9px] h-[9px]" strokeWidth={2.5} />
                protected
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Destination */}
      <td className="py-5 px-6 max-w-[220px]">
        <a
          href={url.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-on-surface-variant hover:text-on-background transition-colors truncate block"
          title={url.originalUrl}
        >
          {truncate(url.originalUrl, 48)}
        </a>
      </td>

      {/* Created */}
      <td className="py-5 px-6 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant whitespace-nowrap">
        {formatDate(url.createdAt)}
      </td>

      {/* Status */}
      <td className="py-5 px-6">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border font-mono text-[10px] uppercase tracking-widest ${
          isActive ? "border-primary/30 bg-primary/10 text-primary" : "border-outline bg-surface-variant text-on-surface-variant"
        }`}>
          <span className={`w-1.5 h-1.5 ${isActive ? "bg-primary" : "bg-on-surface-variant"}`} />
          {statusLabel}
        </span>
      </td>

      {/* Actions */}
      <td className="py-5 px-6">
        {confirmDelete ? (
          <div key="confirm-bar" className="flex items-center justify-end gap-2 opacity-100">
            <span className="font-mono text-[9px] text-error uppercase tracking-widest">Delete?</span>
            <button
              onClick={() => setConfirmDelete(false)}
              className="h-7 px-3 flex items-center gap-1.5 bg-surface-variant text-on-surface-variant font-mono text-[9px] uppercase tracking-widest hover:text-on-background transition-colors"
            >
              <X className="w-2.5 h-2.5" strokeWidth={2.5} />
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-7 px-3 flex items-center gap-1.5 border border-error/40 text-error font-mono text-[9px] uppercase tracking-widest hover:bg-error/10 hover:border-error/80 transition-colors disabled:opacity-50"
              title="Confirm delete"
            >
              {isDeleting ? (
                <span className="w-3 h-3 border border-t-error animate-spin block" />
              ) : (
                <>
                  <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                  Yes
                </>
              )}
            </button>
          </div>
        ) : (
          <div key="normal-bar" className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            {/* Copy */}
            <button onClick={() => onCopy(url.shortCode)} className={ICON_BTN} title="Copy short link">
              <Copy className="w-3.5 h-3.5" strokeWidth={2} />
            </button>

            {/* Analytics */}
            <button onClick={() => onViewAnalytics(url.id)} className={ICON_BTN} title="View analytics">
              <BarChart className="w-3.5 h-3.5" strokeWidth={2} />
            </button>

            {/* Edit */}
            <button onClick={() => onEdit(url)} className={ICON_BTN} title="Edit link">
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
            </button>

            {/* Toggle active */}
            <button onClick={handleToggle} disabled={isToggling} className={`${ICON_BTN} disabled:opacity-50`} title={url.isActive ? "Deactivate" : "Activate"}>
              {isToggling ? (
                <span className="w-4 h-4 border border-t-on-background animate-spin block" />
              ) : url.isActive ? (
                <MinusCircle className="w-3.5 h-3.5" strokeWidth={2} />
              ) : (
                <PlusCircle className="w-3.5 h-3.5" strokeWidth={2} />
              )}
            </button>

            {/* Delete */}
            <button onClick={() => setConfirmDelete(true)} className="w-8 h-8 flex items-center justify-center text-on-surface-variant border border-transparent hover:text-error hover:bg-error/10 hover:border-error/30 transition-all" title="Delete">
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
