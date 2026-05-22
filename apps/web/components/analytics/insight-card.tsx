import { AlertTriangle, CheckCircle2, Info, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { Insight } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const toneStyles = {
  positive: "bg-emerald-500/10 text-emerald-600",
  warning: "bg-amber-500/10 text-amber-600",
  critical: "bg-destructive/10 text-destructive",
  neutral: "bg-primary/10 text-primary"
};

const toneIcons = {
  positive: TrendingUp,
  warning: AlertTriangle,
  critical: AlertTriangle,
  neutral: Info
};

export function InsightCard({ insight }: { insight: Insight }) {
  const Icon = toneIcons[insight.tone] ?? CheckCircle2;

  return (
    <Card className="shadow-sm">
      <CardContent className="flex gap-4 p-5">
        <div className={cn("h-fit rounded-full p-2", toneStyles[insight.tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{insight.title}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {insight.impact}
            </span>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{insight.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
