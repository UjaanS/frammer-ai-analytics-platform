"use client";

import useSWR from "swr";

import { videoRecords as mockVideoRecords } from "@/lib/analytics/mock-data";
import type { VideoRecord } from "@/lib/analytics/types";

type VideosResponse = {
  ok: boolean;
  data: VideoRecord[];
  meta?: { source?: "sql" | "mock"; asOf?: string };
};

export function useSqlAnalyticsRecords() {
  const { data, error, isLoading } = useSWR<VideosResponse>(
    "/api/analytics/videos?limit=10000",
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Analytics videos request failed: ${response.status}`);
      return response.json() as Promise<VideosResponse>;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000
    }
  );

  return {
    records: data?.ok ? data.data : mockVideoRecords,
    source: data?.ok ? data.meta?.source ?? "sql" : "mock",
    error,
    isLoading
  };
}
