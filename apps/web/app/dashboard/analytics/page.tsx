"use client";

import {useState, useEffect} from "react";
import {MousePointerClick, Users, BarChart2, Globe, Monitor, AppWindow} from "lucide-react";
import {getAccountAnalytics} from "@/lib/urls";
import type {UrlAnalytics} from "@/lib/urls";
import {StatCard, BreakdownCard} from "@/components/dashboard/analytics/AnalyticsCards";
import {ClicksChart} from "@/components/dashboard/analytics/ClicksChart";
import {AnalyticsSkeletonGrid} from "@/components/dashboard/analytics/AnalyticsSkeletonGrid";

type Days = 7 | 30 | 90;

export default function AccountAnalyticsPage() {
  const [days, setDays] = useState<Days>(30);
  const [analytics, setAnalytics] = useState<UrlAnalytics | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data natively inside the effect
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const analyticsData = await getAccountAnalytics(days);
        if (mounted) {
          setAnalytics(analyticsData);
        }
      } catch {
        if (mounted) {
          setError(
            "Failed to load account analytics.",
          );
        }
      } finally {
        if (mounted) {
          setIsLoadingData(false);
        }
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [days]);

  const DAY_OPTIONS: Days[] = [7, 30, 90];

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ── */}
      <div className="border-b border-outline p-8 md:p-10 bg-surface flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
              <BarChart2 className="w-3 h-3" strokeWidth={2} />
              Account Analytics
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-on-background">
              All Links
            </h1>
          </div>

          {/* Day range toggle moved to Header */}
          <div className="flex items-center border border-outline self-start md:self-auto">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => {
                  if (days !== d) {
                    setIsLoadingData(true);
                    setError(null);
                    setDays(d);
                  }
                }}
                className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  days === d
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:text-on-background hover:bg-surface-bright"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-8 md:p-10 flex flex-col gap-8">

        {/* Error state */}
        {error && (
          <div className="p-6 border border-error/30 bg-error/10 text-error font-mono text-xs flex items-center gap-3">
            <span className="w-2 h-2 bg-error shrink-0" />
            {error}
          </div>
        )}

        {isLoadingData ? (
          <AnalyticsSkeletonGrid />
        ) : (
          <div className="flex flex-col gap-8">
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                label="Total Clicks"
                value={analytics?.totalClicks ?? 0}
                icon={MousePointerClick}
              />
              <StatCard
                label="Unique Visitors"
                value={analytics?.uniqueVisitors ?? 0}
                icon={Users}
              />
            </div>

            {/* Clicks over time chart */}
            <div className="bg-surface border border-outline p-6 md:p-8 flex flex-col gap-6">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-outline pb-4">
                <MousePointerClick className="w-3 h-3" strokeWidth={2} />
                Clicks Over Time
              </div>
              
              {!analytics || analytics.clicksOverTime.length === 0 ? (
                <div className="h-56 flex items-center justify-center">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50">
                    No click data for this period
                  </p>
                </div>
              ) : (
                <div className="h-56">
                  <ClicksChart data={analytics.clicksOverTime} />
                </div>
              )}
            </div>

            {/* Breakdown cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BreakdownCard label="Devices" icon={Monitor} items={analytics?.devices ?? []} />
              <BreakdownCard label="Browsers" icon={AppWindow} items={analytics?.browsers ?? []} />
              <BreakdownCard label="Countries" icon={Globe} items={analytics?.countries ?? []} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
