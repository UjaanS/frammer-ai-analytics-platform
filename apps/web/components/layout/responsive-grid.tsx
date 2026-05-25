import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ResponsiveGridProps = HTMLAttributes<HTMLDivElement> & {
  minColumnWidth?: "sm" | "md" | "lg";
};

const columnMap = {
  sm: "grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]",
  md: "grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]",
  lg: "grid-cols-[repeat(auto-fit,minmax(24rem,1fr))]"
};

export function ResponsiveGrid({
  className,
  minColumnWidth = "md",
  ...props
}: ResponsiveGridProps) {
  return <div className={cn("grid gap-4", columnMap[minColumnWidth], className)} {...props} />;
}
