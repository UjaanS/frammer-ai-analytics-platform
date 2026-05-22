"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartLegend } from "@/components/charts/chart-legend";

const colors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))"
];

export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius={58} outerRadius={92} paddingAngle={3} dataKey="value">
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={data.map((item, index) => ({
          label: item.name,
          value: item.value.toLocaleString(),
          color: colors[index % colors.length]
        }))}
      />
    </div>
  );
}
