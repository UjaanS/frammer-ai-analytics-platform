"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

export function Sparkline({ data, tone = "primary" }: { data: number[]; tone?: "primary" | "warning" | "critical" }) {
  const stroke =
    tone === "critical"
      ? "hsl(var(--destructive))"
      : tone === "warning"
        ? "hsl(var(--chart-3))"
        : "hsl(var(--chart-2))";

  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((value, index) => ({ index, value }))}>
          <Line type="monotone" dataKey="value" dot={false} stroke={stroke} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
