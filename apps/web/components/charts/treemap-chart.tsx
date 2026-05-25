"use client";

import { ResponsiveContainer, Tooltip, Treemap } from "recharts";

export function TreemapChart({ data }: { data: { name: string; size: number }[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="hsl(var(--background))"
          fill="hsl(var(--chart-4))"
        >
          <Tooltip />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
