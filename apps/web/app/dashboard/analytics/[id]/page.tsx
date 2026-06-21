"use client";

import { useParams, useRouter } from "next/navigation";
import { BarChart } from "lucide-react";

export default function AnalyticsStubPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <>
      {/* Page Header */}
      <div className="border-b border-outline p-8 md:p-12 flex flex-col md:flex-row justify-between items-end gap-6 bg-surface">
        <div>
          <h1 className="font-display font-bold text-4xl mb-2">Analytics</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
            Link ID: {params.id}
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="h-12 px-8 border border-outline text-on-surface-variant font-bold font-mono text-[11px] uppercase tracking-widest hover:border-primary hover:text-on-background active:scale-[0.98] transition-all flex items-center gap-3 shrink-0"
        >
          ← Back to Links
        </button>
      </div>

      {/* Coming Soon placeholder */}
      <section className="grow flex flex-col items-center justify-center gap-6 p-12">
        <BarChart className="w-8 h-8 text-outline" strokeWidth={1.5} />
        <div className="text-center">
          <p className="font-display text-xl font-bold text-on-background mb-2">Coming Soon</p>
          <p className="font-body text-sm text-on-surface-variant max-w-sm leading-relaxed">
            Analytics tracking is on its way. You will be able to see clicks, locations, and referrers here.
          </p>
        </div>
      </section>
    </>
  );
}
