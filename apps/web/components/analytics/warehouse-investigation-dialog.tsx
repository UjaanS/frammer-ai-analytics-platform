"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { WarehouseExplorer } from "@/components/analytics/warehouse-explorer";
import type { WarehouseQueryRequest } from "@/lib/analytics/warehouse";

export function WarehouseInvestigationDialog({
  query,
  onClose
}: {
  query?: WarehouseQueryRequest;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!query) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, query]);

  if (!query || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[120] flex items-stretch justify-center p-0 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Warehouse investigation"
      >
        <button type="button" aria-label="Close warehouse investigation" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative z-[121] flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl sm:rounded-xl dark:border-white/10 dark:bg-[#111421]"
          initial={{ y: 18, scale: 0.98 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 12, scale: 0.98 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wide text-[#ef405b]">Investigation</div>
              <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Warehouse Records</h2>
            </div>
            <button type="button" aria-label="Close warehouse investigation" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
            <WarehouseExplorer key={JSON.stringify(query)} initialQuery={query} mode="overlay" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
