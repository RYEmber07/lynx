"use client";

import {useEffect} from "react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & {digest?: string};
  reset: () => void;
}

/**
 * Global error boundary for the Next.js App Router.
 *
 * This file is automatically picked up by Next.js and wraps every page/layout
 * below the root layout. It renders when an unhandled error is thrown during
 * rendering, data-fetching, or in a Server Component.
 *
 * - `error`  – the thrown Error object (digest is the server-side error ID).
 * - `reset`  – re-renders the segment, giving the user a chance to recover.
 *
 * Note: This does NOT catch errors inside the root layout itself (app/layout.tsx).
 * Each route group or segment can also have its own error.tsx for more granular
 * handling; this one acts as the fallback for the whole app.
 */
export default function GlobalError({error, reset}: ErrorPageProps) {
  useEffect(() => {
    // Log to your monitoring service here (Sentry, Datadog, etc.)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md border border-error/30 bg-error/5 p-10 flex flex-col items-center gap-6 text-center animate-fade-in">
        {/* Icon */}
        <div className="w-12 h-12 border border-error/40 flex items-center justify-center bg-error/10 mb-2">
          <span className="w-4 h-4 bg-error block" />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h1 className="font-display font-bold text-2xl text-on-background uppercase tracking-widest">
            Something went wrong
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant leading-relaxed">
            An unexpected error occurred. You can try again or return to the
            home page.
          </p>
        </div>

        {/* Digest (server error ID) */}
        {error.digest && (
          <p className="font-mono text-[9px] text-outline tracking-widest">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={reset}
            className="h-10 px-6 bg-primary text-on-primary font-mono text-[10px] uppercase tracking-widest hover:bg-primary-container active:scale-[0.98] transition-all">
            Try again
          </button>
          <Link
            href="/"
            className="h-10 px-6 flex items-center border border-outline text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition-colors">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
