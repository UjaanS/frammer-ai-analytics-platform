import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function WidgetChrome({
  title,
  description,
  actions,
  children,
  className
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#24283d] p-5 shadow-xl shadow-black/20",
        className
      )}
    >
      <div className="widget-drag-handle mb-4 flex shrink-0 cursor-move flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-black text-slate-300 md:text-2xl">{title}</h2>
          {description ? <p className="mt-1 text-sm font-medium text-slate-400">{description}</p> : null}
        </div>
        {actions ? (
          <div
            className="widget-interactive cursor-auto"
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {actions}
          </div>
        ) : null}
      </div>
      <div className="widget-interactive min-h-0 flex-1 cursor-auto overflow-hidden">{children}</div>
    </section>
  );
}
