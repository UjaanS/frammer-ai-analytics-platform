import { cn } from "@/lib/utils";

export function Heatmap({
  rows,
  columns,
  values
}: {
  rows: string[];
  columns: string[];
  values: number[][];
}) {
  const max = Math.max(...values.flat());

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[680px] space-y-2">
        <div className="grid grid-cols-[8rem_repeat(6,1fr)] gap-2 text-xs text-muted-foreground">
          <span />
          {columns.map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>
        {rows.map((row, rowIndex) => (
          <div key={row} className="grid grid-cols-[8rem_repeat(6,1fr)] gap-2">
            <div className="truncate text-sm font-medium">{row}</div>
            {columns.map((column, columnIndex) => {
              const value = values[rowIndex][columnIndex];
              const intensity = value / max;
              return (
                <div
                  key={column}
                  className={cn("rounded-md px-2 py-3 text-center text-xs font-medium")}
                  style={{ background: `hsl(var(--chart-1) / ${0.12 + intensity * 0.62})` }}
                >
                  {value}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
