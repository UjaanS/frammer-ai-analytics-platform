"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type HorizontalBarChartProps = {
  data: { name: string; value: number }[];
};

export function HorizontalBarChart({ data }: HorizontalBarChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
          <XAxis type="number" tickLine={false} axisLine={false} />
          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={96} />
          <Tooltip />
          <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
