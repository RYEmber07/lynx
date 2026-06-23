"use client";

import {useState, useEffect} from "react";
import { X, Lock, Clock } from "lucide-react";
import { createUrl, updateUrl, type ShortUrl } from "@/lib/urls";
import { DISPLAY_URL } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UrlModalProps {
  onClose: () => void;
  /** If provided, modal is in edit mode. */
  editUrl?: ShortUrl;
  onCreated: (url: ShortUrl) => void;
  onUpdated: (url: ShortUrl) => void;
  onError: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse an ISO datetime string into separate date and time parts. */
function parseIso(iso: string | null): {date: string; time: string} {
  if (!iso) return {date: "", time: ""};
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  return {date, time};
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UrlModal({onClose, editUrl, onCreated, onUpdated, onError}: UrlModalProps) {
  const isEditMode = editUrl !== undefined;

  const initialDateStr = editUrl ? parseIso(editUrl.expiresAt).date : "";
  const initialTimeStr = editUrl ? parseIso(editUrl.expiresAt).time : "";

  const [originalUrl, setOriginalUrl] = useState(editUrl?.originalUrl ?? "");
  const [customSlug, setCustomSlug] = useState(editUrl?.customSlug ?? "");
  const [expireDate, setExpireDate] = useState(initialDateStr);
  const [expireTime, setExpireTime] = useState(initialTimeStr);
  const [isPasswordProtected, setIsPasswordProtected] = useState(editUrl?.isPasswordProtected ?? false);
  const [isExpirationEnabled, setIsExpirationEnabled] = useState(!!initialDateStr);
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(editUrl?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let combinedExpiresAt: string | null | undefined;
      if (isExpirationEnabled && expireDate && expireTime) {
        combinedExpiresAt = new Date(`${expireDate}T${expireTime}`).toISOString();
      } else if (isEditMode && !isExpirationEnabled) {
        // User cleared the expiration - send null to remove it
        combinedExpiresAt = null;
      }

      if (isEditMode) {
        // Build update payload - only send fields the API accepts
        const data: Parameters<typeof updateUrl>[1] = {
          originalUrl,
          // Send null to clear, string to set, omit to leave unchanged
          customSlug: customSlug.trim() !== "" ? customSlug.trim() : null,
          ...(combinedExpiresAt !== undefined && {expiresAt: combinedExpiresAt}),
          isActive,
          isPasswordProtected,
          // Only send password if the user typed one
          ...(password.trim() !== "" && {password: password.trim()}),
        };
        const updated = await updateUrl(editUrl!.id, data);
        onUpdated(updated);
      } else {
        const payload = {
          originalUrl,
          ...(customSlug.trim() !== "" && {customSlug: customSlug.trim()}),
          ...(combinedExpiresAt && {expiresAt: combinedExpiresAt}),
          ...(isPasswordProtected && {isPasswordProtected: true}),
          ...(isPasswordProtected && password.trim() !== "" && {password: password.trim()}),
        };
        const created = await createUrl(payload);
        onCreated(created);
      }

      onClose();
    } catch (err: unknown) {
      const axiosErr = err as {response?: {data?: {error?: string; errors?: Record<string, string[]>}}};
      const fieldErrors = axiosErr.response?.data?.errors;
      if (fieldErrors) {
        onError(Object.values(fieldErrors).flat().join(" · "));
      } else {
        onError(axiosErr.response?.data?.error ?? (isEditMode ? "Failed to update link." : "Failed to create link."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <section className="relative w-full max-w-3xl animate-slide-up bg-surface border border-outline shadow-machined rounded-none flex flex-col">

        {/* Header */}
        <div className="border-b border-outline p-5 flex justify-between items-center bg-surface-bright">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-on-background flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-primary animate-pulse-slow" />
            {isEditMode ? "Edit Link" : "Create Short Link"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border border-transparent hover:border-outline text-on-surface-variant hover:text-on-background transition-colors"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-8 md:p-10 flex flex-col gap-8 bg-surface">

            {/* Destination URL + Custom Alias */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-7 flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Destination URL
                </label>
                <input
                  type="url"
                  required
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  placeholder="https://example.com/long-url"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-surface-bright border border-outline text-on-background font-mono text-sm px-4 focus:border-primary focus:outline-none transition-colors placeholder-on-surface-variant/40 disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-5 flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center justify-between">
                  <span>Custom Alias</span>
                  <span className="text-outline">optional</span>
                </label>
                <div className="flex h-12 border border-outline focus-within:border-primary transition-colors bg-surface-bright">
                  <span className="flex items-center px-4 font-mono text-[10px] text-on-surface-variant border-r border-outline tracking-widest bg-surface shrink-0">
                    {DISPLAY_URL}/
                  </span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="my-link"
                    disabled={isSubmitting}
                    className="w-full h-full bg-transparent border-none px-4 font-mono text-sm text-on-background outline-none placeholder-on-surface-variant/40 disabled:opacity-50"
                  />
                </div>
                {isEditMode && (
                  <p className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest">
                    Leave blank to use auto-generated code
                  </p>
                )}
              </div>
            </div>

            {/* Optional fields */}
            {(isPasswordProtected || isExpirationEnabled) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-outline bg-surface-bright animate-fade-in">
                {isPasswordProtected && (
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                      <Lock className="w-3 h-3" strokeWidth={2} />
                      {isEditMode ? "New Password" : "Password"}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isEditMode ? "Leave blank to keep current" : "Enter password"}
                      disabled={isSubmitting}
                      required={!isEditMode && isPasswordProtected}
                      className="w-full h-12 bg-surface border border-outline text-on-background font-mono text-sm px-4 focus:border-primary focus:outline-none transition-colors placeholder-on-surface-variant/40 disabled:opacity-50"
                    />
                  </div>
                )}

                {isExpirationEnabled && (
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                      <Clock className="w-3 h-3" strokeWidth={2} />
                      Expires at
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={expireDate}
                        onChange={(e) => setExpireDate(e.target.value)}
                        required={isExpirationEnabled}
                        disabled={isSubmitting}
                        className="w-1/2 h-12 bg-surface border border-outline text-on-background font-mono text-sm px-4 focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                        style={{colorScheme: "dark"}}
                      />
                      <input
                        type="time"
                        value={expireTime}
                        onChange={(e) => setExpireTime(e.target.value)}
                        required={isExpirationEnabled}
                        disabled={isSubmitting}
                        className="w-1/2 h-12 bg-surface border border-outline text-on-background font-mono text-sm px-4 focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                        style={{colorScheme: "dark"}}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="border-t border-outline bg-surface-bright p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-8 w-full md:w-auto">
              {/* Password protect toggle */}
              <button
                type="button"
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setIsPasswordProtected(!isPasswordProtected)}
              >
                <div className={`w-4 h-4 border transition-colors flex items-center justify-center ${isPasswordProtected ? "border-primary bg-primary" : "border-outline"}`}>
                  {isPasswordProtected && <div className="w-2 h-2 bg-on-primary" />}
                </div>
                <span className={`font-mono text-[10px] uppercase tracking-widest transition-colors ${isPasswordProtected ? "text-primary" : "text-on-surface-variant group-hover:text-on-background"}`}>
                  Password protect
                </span>
              </button>

              {/* Expiration toggle */}
              <button
                type="button"
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setIsExpirationEnabled(!isExpirationEnabled)}
              >
                <div className={`w-4 h-4 border transition-colors flex items-center justify-center ${isExpirationEnabled ? "border-primary bg-primary" : "border-outline"}`}>
                  {isExpirationEnabled && <div className="w-2 h-2 bg-on-primary" />}
                </div>
                <span className={`font-mono text-[10px] uppercase tracking-widest transition-colors ${isExpirationEnabled ? "text-primary" : "text-on-surface-variant group-hover:text-on-background"}`}>
                  Set expiration
                </span>
              </button>

              {/* Active toggle (edit mode only) */}
              {isEditMode && (
                <button
                  type="button"
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => setIsActive(!isActive)}
                >
                  <div className={`w-4 h-4 border transition-colors flex items-center justify-center ${isActive ? "border-primary bg-primary" : "border-outline"}`}>
                    {isActive && <div className="w-2 h-2 bg-on-primary" />}
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-widest transition-colors ${isActive ? "text-primary" : "text-on-surface-variant group-hover:text-on-background"}`}>
                    Active
                  </span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto h-12 px-10 bg-primary text-on-primary font-bold font-mono text-xs uppercase tracking-widest hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-3 h-3 border border-t-on-primary animate-spin rounded-none block" />
                  {isEditMode ? "Saving..." : "Creating..."}
                </span>
              ) : (
                isEditMode ? "Save Changes" : "Create Link"
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
