"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

import { defaultFilters, parseFilters } from "@/lib/analytics/filters";
import type { FilterState } from "@/lib/analytics/types";

export function useAnalyticsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  function setFilter<Key extends keyof FilterState>(key: Key, value: FilterState[Key]) {
    const nextParams = new URLSearchParams(searchParams.toString());
    const defaultValue = defaultFilters[key];
    const serialized = Array.isArray(value) ? value.join(",") : String(value);
    const isDefault = Array.isArray(value)
      ? value.length === 0
      : serialized === String(defaultValue);

    if (isDefault) {
      nextParams.delete(String(key));
    } else {
      nextParams.set(String(key), serialized);
    }

    startTransition(() => {
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function resetFilters() {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  return {
    filters,
    setFilter,
    resetFilters,
    isPending
  };
}
