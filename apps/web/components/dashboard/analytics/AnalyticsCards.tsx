import React from "react";
import type {BreakdownItem} from "@/lib/urls";

export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-surface border border-outline p-6 md:p-8 flex flex-col gap-3">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
        <Icon className="w-3 h-3" strokeWidth={2} />
        {label}
      </div>
      <span className="font-display text-4xl font-bold text-on-background tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

export function BreakdownCard({
  label,
  icon: Icon,
  items,
}: {
  label: string;
  icon: React.ElementType;
  items: BreakdownItem[];
}) {
  return (
    <div className="bg-surface border border-outline p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-outline pb-4">
        <Icon className="w-3 h-3" strokeWidth={2} />
        {label}
      </div>

      {items.length === 0 ? (
        <p className="font-mono text-[10px] text-on-surface-variant/50 uppercase tracking-widest py-4 text-center">
          No data yet
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest">
                <span className="text-on-background truncate max-w-[70%]">{item.label}</span>
                <span className="text-on-surface-variant tabular-nums">
                  {item.clicks.toLocaleString()} · {item.percentage}%
                </span>
              </div>
              {/* Progress bar — 1px height, filled by a positioned child */}
              <div className="h-px bg-outline w-full relative">
                <div
                  className="absolute top-0 left-0 h-full bg-primary transition-all duration-500"
                  style={{width: `${item.percentage}%`}}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
