import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { ENABLE_NEW_GRID_SYSTEM } from "@/src/modules/analytics/layout";

export function WhiteChartCanvas({ children }: { children: ReactNode }) {
  return (
    <div className={cn("h-full overflow-hidden rounded-lg bg-white text-slate-900", ENABLE_NEW_GRID_SYSTEM ? "min-h-[200px] p-3" : "min-h-[220px] p-4")}>
      {children}
    </div>
  );
}

export function SimpleDataTable({
  title,
  columns,
  rows
}: {
  title?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      {title ? <h3 className={cn("font-black text-white", ENABLE_NEW_GRID_SYSTEM ? "mb-2 text-sm" : "mb-3 text-base")}>{title}</h3> : null}
      <div className="min-h-0 overflow-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} className={cn("bg-white font-black text-slate-800", ENABLE_NEW_GRID_SYSTEM ? "px-3 py-2.5" : "px-4 py-3")}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`} className="border-b border-slate-500/70">
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className={cn("font-semibold text-slate-100", ENABLE_NEW_GRID_SYSTEM ? "px-3 py-2.5" : "px-4 py-3")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
