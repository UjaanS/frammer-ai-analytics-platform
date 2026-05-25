import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { GridItem } from "./GridItem";
import type { DashboardGridConfig } from "./layoutConfig";
import { sortGridItems } from "./gridUtils";

type DashboardGridProps = {
  config: DashboardGridConfig;
  childrenById: Record<string, ReactNode>;
  className?: string;
};

export function DashboardGrid({ config, childrenById, className }: DashboardGridProps) {
  return (
    <div
      className={cn("grid grid-cols-1 items-stretch gap-4 md:grid-cols-6 xl:grid-cols-12", className)}
      style={{
        gridAutoRows: "minmax(0, auto)"
      }}
    >
      {sortGridItems(config.items).map((item) => (
        <GridItem
          key={item.id}
          columnSpan={item.columnSpan}
          rowSpan={item.rowSpan}
        >
          {childrenById[item.id]}
        </GridItem>
      ))}
    </div>
  );
}
