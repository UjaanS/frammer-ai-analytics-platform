"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { TrendPoint } from "@/lib/analytics/types";

type UnifiedTrendChartProps = {
  data: TrendPoint[];
  mode?: "count" | "duration";
  comparison?: boolean;
};

export function UnifiedTrendChart({ data, mode = "count", comparison = true }: UnifiedTrendChartProps) {
  const primaryKey = mode === "duration" ? "duration" : "uploads";

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: 0, right: 16, top: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--background))"
            }}
          />
          <Area
            type="monotone"
            dataKey={primaryKey}
            fill="hsl(var(--chart-1) / 0.14)"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
          />
          <Line type="monotone" dataKey="processed" dot={false} stroke="hsl(var(--chart-2))" strokeWidth={2} />
          <Line type="monotone" dataKey="published" dot={false} stroke="hsl(var(--chart-3))" strokeWidth={2} />
          {comparison ? (
            <Line
              type="monotone"
              dataKey="previous"
              dot={false}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
