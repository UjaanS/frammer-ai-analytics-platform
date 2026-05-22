import { AlertCircle } from "lucide-react";

import type { Insight } from "@/lib/analytics/types";

export function AnomalyBanner({ alerts }: { alerts: Insight[] }) {
  if (!alerts.length) return null;

  return (
    <div className="grid gap-3">
      {alerts.map((alert) => (
        <div
          key={alert.title}
          className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-start"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">{alert.title}</h3>
            <p className="mt-1 text-sm opacity-85">{alert.description}</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/60 dark:text-amber-100 sm:ml-auto">
            {alert.impact}
          </span>
        </div>
      ))}
    </div>
  );
}
