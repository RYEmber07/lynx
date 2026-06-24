import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Custom Recharts tooltip
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: {value: number}[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-outline p-3 shadow-xl flex flex-col gap-1 min-w-[120px]">
        <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
          {new Date(label || "").toLocaleString("en", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-primary shrink-0" />
          <span className="font-mono text-xs text-on-background">
            {payload[0].value.toLocaleString()} clicks
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export function ClicksChart({data}: {data: {date: string; clicks: number}[]}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{top: 4, right: 4, left: -24, bottom: 0}}>
        <defs>
          <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-primary)"
              stopOpacity={0.2}
            />
            <stop
              offset="95%"
              stopColor="var(--color-primary)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-outline)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{
            fontFamily: "monospace",
            fontSize: 9,
            fill: "var(--color-on-surface-variant)",
          }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return `${d.toLocaleString("en", {month: "short"})} ${d.getDate()}`;
          }}
        />
        <YAxis
          tick={{
            fontFamily: "monospace",
            fontSize: 9,
            fill: "var(--color-on-surface-variant)",
          }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{stroke: "var(--color-outline)", strokeWidth: 1}}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#clicksGradient)"
          dot={false}
          activeDot={{
            r: 4,
            fill: "var(--color-primary)",
            stroke: "var(--color-surface)",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
