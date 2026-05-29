"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Copy, Download, Maximize2, Table2, X } from "lucide-react";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { copyElementAsImage, downloadCsv, exportElementAsPng } from "@/lib/export/client-export";
import { cn } from "@/lib/utils";

// Context flag widget bodies can read to render denser content when expanded —
// e.g. VideoListWidget bumps its rowsLimit to show all records inside the modal.
const ExpandedContext = createContext(false);
export function useIsWidgetExpanded() {
  return useContext(ExpandedContext);
}

export function WidgetChrome({
  title,
  description,
  actions,
  children,
  className,
  exportRows,
  exportFileName,
  onRemove,
  expandable = true
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  exportRows?: Array<Record<string, string | number | boolean | undefined>>;
  exportFileName?: string;
  onRemove?: () => void;
  expandable?: boolean;
}) {
  const exportRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const filename = sanitizeFileName(exportFileName ?? title);

  // Esc closes the expanded view, mirroring the KPIModal pattern. Listener
  // is attached only while expanded so the rest of the dashboard's
  // keyboard handling isn't disturbed.
  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

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
    <>
      <section
        ref={exportRef}
        className={cn(
          "group flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#24283d] dark:shadow-xl dark:shadow-black/20",
          className
        )}
      >
        <div className="widget-drag-handle flex shrink-0 cursor-move flex-col gap-2 mb-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-slate-700 md:text-xl dark:text-slate-300">{title}</h2>
            {description ? <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <div
            data-export-ignore="true"
            className="widget-interactive flex cursor-auto flex-wrap items-center gap-2"
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            <div className="flex items-center gap-1 opacity-70 transition-opacity hover:opacity-100 focus-within:opacity-100 group-hover:opacity-100">
              {expandable ? (
                <WidgetIconButton label="Expand" onClick={() => setExpanded(true)}>
                  <Maximize2 className="h-4 w-4" />
                </WidgetIconButton>
              ) : null}
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

      {/* Expanded view: portaled to body, takes most of the viewport, scrolls
          internally. Children are rendered again here — independent React
          instances, but SWR cache de-dupes their data calls so both copies
          share the same fetched rows. */}
      {expandable && typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {expanded ? (
                <motion.div
                  className="fixed inset-0 z-[100] flex items-stretch justify-center p-0 sm:items-center sm:p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${title} expanded view`}
                >
                  <motion.button
                    type="button"
                    aria-label="Close expanded view"
                    className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm dark:bg-black/65"
                    onClick={() => setExpanded(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                  <motion.div
                    className="widget-interactive relative z-[101] flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-6xl sm:rounded-xl dark:border-white/10 dark:bg-[#24283d]"
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-white/10">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-wide text-[#ef405b]">Expanded view</div>
                        <h2 className="mt-1 truncate text-2xl font-black text-slate-900 dark:text-white">{title}</h2>
                        {description ? <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
                      </div>
                      <button
                        type="button"
                        aria-label="Close expanded view"
                        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                        onClick={() => setExpanded(false)}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    {/* Action row (toolbar / mode toggles) carried over from the chrome */}
                    {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3 dark:border-white/[0.05]">{actions}</div> : null}
                    {/* Body */}
                    <div className="min-h-0 flex-1 overflow-auto p-6">
                      <div className="h-full min-h-[480px]">
                        <ExpandedContext.Provider value={true}>{children}</ExpandedContext.Provider>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
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
        "inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
        danger ? "hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-400/30 dark:hover:bg-rose-500/15 dark:hover:text-rose-100" : null
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
