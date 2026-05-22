"use client";

import type { ChangeEvent } from "react";

import { cn } from "@/lib/utils";

type FilterSelectProps = {
  label: string;
  value: string;
  options: string[] | { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
};

export function FilterSelect({ label, value, options, onChange, className }: FilterSelectProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value);
  }

  return (
    <label className={cn("grid gap-1 text-xs font-medium text-muted-foreground", className)}>
      {label}
      <select
        value={value}
        onChange={handleChange}
        className="h-9 rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => {
          const normalized = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={normalized.value} value={normalized.value}>
              {normalized.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
