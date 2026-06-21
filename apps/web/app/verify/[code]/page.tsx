"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { isAxiosError } from "axios";
import api from "@/lib/api";

export default function VerifyPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data } = await api.post<{ originalUrl: string }>(`/${code}/verify`, { password });
      window.location.href = data.originalUrl;
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as { error?: string; errors?: Record<string, string[]> } | undefined;
        if (err.response?.status === 429) {
          setError("Too many attempts. Please wait 15 minutes before trying again.");
        } else if (data?.errors) {
          setError(Object.values(data.errors).flat().join(" | "));
        } else {
          setError(data?.error ?? "Verification failed.");
        }
      } else {
        setError(err instanceof Error ? err.message : "Verification failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <button onClick={() => router.push("/")} className="font-display text-4xl font-bold tracking-widest text-on-background mb-3">
            LYNX<span className="text-primary">.</span>
          </button>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-on-surface-variant flex items-center gap-3">
            <span className="w-8 h-px bg-outline"></span>
            Password protected link
            <span className="w-8 h-px bg-outline"></span>
          </div>
        </div>

        <div className="bg-surface border border-outline shadow-machined rounded-none p-8 md:p-10">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">

            {/* Info */}
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
              <span className="w-1.5 h-1.5 bg-primary animate-pulse-slow shrink-0"></span>
              Unlocking: <span className="text-primary">{code}</span>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-12 bg-surface-bright border border-outline text-on-background font-mono text-sm px-4 focus:border-primary focus:outline-none transition-colors placeholder-on-surface-variant/40 disabled:opacity-50"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-error/10 border border-error/20 text-error font-mono text-[10px] uppercase tracking-widest flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-error shrink-0"></span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 mt-2 bg-primary text-on-primary font-bold font-mono text-xs uppercase tracking-widest hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-3 h-3 border border-t-on-primary animate-spin rounded-none"></span>
                  Verifying...
                </span>
              ) : (
                "Unlock Link"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
