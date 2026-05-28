"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type KPIModalProps = {
  open: boolean;
  title: string;
  contextLabel: string;
  detail: string;
  value: string;
  comparisonSummary?: string;
  chart: ReactNode;
  breakdowns?: ReactNode;
  onClose: () => void;
};

export function KPIModal({ open, title, contextLabel, detail, value, comparisonSummary, chart, breakdowns, onClose }: KPIModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} details`}
        >
          <motion.button
            type="button"
            aria-label="Close KPI modal backdrop"
            className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm dark:bg-black/65"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="widget-interactive relative z-[101] h-[100dvh] w-full overflow-y-auto rounded-none border border-slate-200 bg-white p-5 shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-lg dark:border-white/10 dark:bg-[#24283d]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-[#ef405b]">Metric breakdown</div>
                <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{title}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {contextLabel} · {detail}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close KPI modal"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={onClose}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#2d3147]">
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400">Current value</div>
                <div className="mt-3 text-4xl font-black text-slate-900 dark:text-white">{value}</div>
                <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{detail}</p>
                {comparisonSummary ? (
                  <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm font-bold text-slate-700 dark:bg-white/[0.04] dark:text-slate-200">{comparisonSummary}</div>
                ) : null}
              </div>
              {chart}
            </div>
            {breakdowns ? <div className="mt-4">{breakdowns}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
