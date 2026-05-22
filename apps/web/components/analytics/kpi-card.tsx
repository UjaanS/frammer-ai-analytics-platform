import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Sparkline } from "@/components/analytics/sparkline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KpiMetric } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const statusClass = {
  good: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-destructive"
};

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const TrendIcon = metric.trend > 0 ? ArrowUpRight : metric.trend < 0 ? ArrowDownRight : Minus;

  return (
    <Card className="overflow-hidden shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", statusClass[metric.status])} />
            <span className="text-xs capitalize text-muted-foreground">{metric.status}</span>
          </div>
        </div>
        <Sparkline data={metric.sparkline} tone={metric.status === "good" ? "primary" : metric.status} />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-3xl font-semibold tracking-normal">{metric.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{metric.secondary}</p>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
              metric.trend >= 0
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-destructive/10 text-destructive"
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            {Math.abs(metric.trend)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
