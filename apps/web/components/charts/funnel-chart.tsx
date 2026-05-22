import { ArrowRight } from "lucide-react";

type FunnelStep = {
  label: string;
  value: number;
  conversion: number;
  latency: string;
};

export function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(...steps.map((step) => step.value));

  return (
    <div className="grid gap-3">
      {steps.map((step, index) => (
        <div key={step.label} className="grid gap-2 rounded-lg bg-muted/50 p-4 md:grid-cols-[11rem_1fr_8rem_7rem] md:items-center">
          <div>
            <div className="text-sm font-semibold">{step.label}</div>
            <div className="text-xs text-muted-foreground">{step.latency}</div>
          </div>
          <div className="h-3 rounded-full bg-background">
            <div
              className="h-3 rounded-full bg-primary"
              style={{ width: `${Math.max(8, (step.value / max) * 100)}%` }}
            />
          </div>
          <div className="text-sm font-medium">{step.value.toLocaleString()}</div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {index > 0 ? <ArrowRight className="h-3.5 w-3.5" /> : null}
            {step.conversion}%
          </div>
        </div>
      ))}
    </div>
  );
}
