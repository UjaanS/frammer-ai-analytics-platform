import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type GridItemProps = {
  children: ReactNode;
  columnSpan?: number;
  rowSpan?: number;
  className?: string;
};

export function GridItem({ children, columnSpan = 1, rowSpan = 1, className }: GridItemProps) {
  const style = {
    "--analytics-grid-column-span": Math.min(columnSpan, 12),
    "--analytics-grid-tablet-column-span": Math.min(columnSpan, 6),
    "--analytics-grid-row-span": rowSpan
  } as CSSProperties;

  return (
    <div
      className={cn(
        "min-w-0 md:[grid-column:span_var(--analytics-grid-tablet-column-span)_/_span_var(--analytics-grid-tablet-column-span)] xl:[grid-column:span_var(--analytics-grid-column-span)_/_span_var(--analytics-grid-column-span)]",
        className
      )}
      style={{
        ...style,
        gridRow: `span ${rowSpan} / span ${rowSpan}`,
        minWidth: 0
      }}
    >
      {children}
    </div>
  );
}
