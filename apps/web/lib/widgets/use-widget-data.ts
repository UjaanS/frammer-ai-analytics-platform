"use client";

// useWidgetData — SWR-backed hook every widget calls to load its data.
// Identical (queryKey, config, context) tuples dedupe to one network
// request. When the user changes a filter, only the queries with new
// contexts refetch.

import useSWR from "swr";

import type { DashboardContext, WidgetConfig, WidgetQueryKey } from "@/lib/widgets/types";

type Args = {
  queryKey: WidgetQueryKey;
  config: WidgetConfig;
  context?: DashboardContext;
};

type Response<T> = { ok: true; data: T } | { ok: false; error: string };

async function fetchWidgetData<T>(args: Args): Promise<T> {
  const response = await fetch("/api/mock/widget-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });
  const json = (await response.json()) as Response<T>;
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

export function useWidgetData<T = unknown>(
  queryKey: WidgetQueryKey | null,
  config: WidgetConfig,
  context?: DashboardContext
) {
  // Passing null as queryKey skips the fetch (useful for conditional
  // comparison-context loads inside a widget).
  const key = queryKey ? JSON.stringify({ queryKey, config, context }) : null;
  const { data, error, isLoading } = useSWR<T>(
    key,
    () => fetchWidgetData<T>({ queryKey: queryKey as WidgetQueryKey, config, context }),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 30_000
    }
  );
  return { data, error, isLoading };
}
