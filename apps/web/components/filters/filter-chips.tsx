"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { defaultFilters, filterChips } from "@/lib/analytics/filters";
import type { FilterState } from "@/lib/analytics/types";

type FilterChipsProps = {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void;
  resetFilters: () => void;
};

export function FilterChips({ filters, setFilter, resetFilters }: FilterChipsProps) {
  const chips = filterChips(filters);
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => {
            const key = chip.key as keyof FilterState;
            setFilter(key, defaultFilters[key]);
          }}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
        >
          {chip.label}: {chip.value}
          <X className="h-3 w-3" />
        </button>
      ))}
      <Button variant="ghost" size="sm" onClick={resetFilters}>
        Clear chips
      </Button>
    </div>
  );
}
