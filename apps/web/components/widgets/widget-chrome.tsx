"use client";

import { Copy, Download, Table2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";

import { copyElementAsImage, downloadCsv, exportElementAsPng } from "@/lib/export/client-export";
import { cn } from "@/lib/utils";
import { ENABLE_NEW_GRID_SYSTEM } from "@/src/modules/analytics/layout";

export function WidgetChrome({
  title,
  description,
  actions,
  children,
  className,
  exportRows,
  exportFileName,
  onRemove
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  exportRows?: Array<Record<string, string | number | boolean | undefined>>;
  exportFileName?: string;
  onRemove?: () => void;
}) {
  const exportRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);
  const filename = sanitizeFileName(exportFileName ?? title);

  async function runExport(action: "png" | "copy" | "csv") {
    if (exporting) return;
    setExporting(true);
    try {
      if (action === "png" && exportRef.current) {
        await exportElementAsPng(exportRef.current, `${filename}.png`);
      }
      if (action === "copy" && exportRef.current) {
        await copyElementAsImage(exportRef.current);
      }
      if (action === "csv" && exportRows?.length) {
        downloadCsv(`${filename}.csv`, exportRows);
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <section
      ref={exportRef}
      className={cn(
        "group flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#24283d] shadow-xl shadow-black/20",
        ENABLE_NEW_GRID_SYSTEM ? "p-4" : "p-5",
        className
      )}
    >
      <div className={cn("widget-drag-handle flex shrink-0 cursor-move flex-col md:flex-row md:items-start md:justify-between", ENABLE_NEW_GRID_SYSTEM ? "mb-3 gap-2" : "mb-4 gap-3")}>
        <div className="min-w-0">
          <h2 className={cn("truncate font-black text-slate-300", ENABLE_NEW_GRID_SYSTEM ? "text-lg md:text-xl" : "text-xl md:text-2xl")}>{title}</h2>
          {description ? <p className="mt-1 text-sm font-medium text-slate-400">{description}</p> : null}
        </div>
        <div
          data-export-ignore="true"
          className="widget-interactive flex cursor-auto flex-wrap items-center gap-2"
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
        {actions ? (
          <div
            className="flex flex-wrap items-center gap-2"
          >
            {actions}
          </div>
        ) : null}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <WidgetIconButton label="Export PNG" disabled={exporting} onClick={() => runExport("png")}>
              <Download className="h-4 w-4" />
            </WidgetIconButton>
            <WidgetIconButton label="Copy image" disabled={exporting} onClick={() => runExport("copy")}>
              <Copy className="h-4 w-4" />
            </WidgetIconButton>
            {exportRows?.length ? (
              <WidgetIconButton label="Download CSV" disabled={exporting} onClick={() => runExport("csv")}>
                <Table2 className="h-4 w-4" />
              </WidgetIconButton>
            ) : null}
            {onRemove ? (
              <WidgetIconButton label="Remove widget" onClick={onRemove} danger>
                <X className="h-4 w-4" />
              </WidgetIconButton>
            ) : null}
          </div>
        </div>
      </div>
      <div className="widget-interactive min-h-0 flex-1 cursor-auto overflow-hidden">{children}</div>
    </section>
  );
}

function WidgetIconButton({
  label,
  disabled,
  danger,
  onClick,
  children
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
        ENABLE_NEW_GRID_SYSTEM ? "h-7 w-7" : "h-8 w-8",
        danger ? "hover:border-rose-400/30 hover:bg-rose-500/15 hover:text-rose-100" : null
      )}
    >
      {children}
    </button>
  );
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "frammer-widget";
}
