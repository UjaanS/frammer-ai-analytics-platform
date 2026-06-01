"use client";

import useSWR from "swr";

import type { WarehouseCatalog } from "@/lib/analytics/warehouse";

export function useWarehouseCatalog() {
  const { data, error, isLoading } = useSWR<{ ok: boolean; data: WarehouseCatalog }>(
    "/api/analytics/warehouse/catalog",
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Warehouse catalog request failed: ${response.status}`);
      return response.json() as Promise<{ ok: boolean; data: WarehouseCatalog }>;
    },
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  return { catalog: data?.data, error, isLoading };
}
