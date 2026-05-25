import type { ReactNode } from "react";

export function WhiteChartCanvas({ children }: { children: ReactNode }) {
  return (
<<<<<<< HEAD
    <div
      className={cn(
        "flex overflow-hidden rounded-lg bg-white text-slate-900",
        ENABLE_NEW_GRID_SYSTEM ? "h-full min-h-[220px] p-3" : "h-[280px] min-h-[240px] p-4"
      )}
    >
      <div className="min-h-0 w-full flex-1">{children}</div>
=======
    <div className="h-full min-h-[200px] overflow-hidden rounded-lg bg-white p-3 text-slate-900">
      {children}
>>>>>>> origin/claude/elated-galileo-73ca50
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
      {title ? <h3 className="mb-2 text-sm font-black text-slate-900 dark:text-white">{title}</h3> : null}
      <div className="min-h-0 overflow-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} className="bg-slate-50 px-3 py-2.5 font-black text-slate-800 dark:bg-white">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`} className="border-b border-slate-200 dark:border-slate-500/70">
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-100">
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
