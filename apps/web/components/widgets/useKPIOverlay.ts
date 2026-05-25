"use client";

import { useCallback, useState } from "react";

export function useKPIOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  const openKPI = useCallback(() => setIsOpen(true), []);
  const closeKPI = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    openKPI,
    closeKPI
  };
}
