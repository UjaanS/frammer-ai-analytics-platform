import { NextResponse } from "next/server";

import { runWidgetQuery } from "@/lib/widgets/dashboard-data";
import type { DashboardContext, WidgetConfig, WidgetQueryKey } from "@/lib/widgets/types";

type WidgetDataRequest = {
  queryKey: WidgetQueryKey;
  config: WidgetConfig;
  context?: DashboardContext;
};

type DataMode = "mock" | "sql" | "fallback";

export async function handleWidgetDataRequest(request: Request) {
  let body: WidgetDataRequest;
  try {
    body = (await request.json()) as WidgetDataRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.queryKey) {
    return NextResponse.json({ ok: false, error: "Missing queryKey" }, { status: 400 });
  }

  const mode = analyticsDataMode();
  if (mode === "mock") return mockResponse(body);

  try {
    const response = await fetch(`${apiBaseUrl()}/analytics/widgets/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Analytics API returned ${response.status}`);
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    if (mode === "fallback") {
      return mockResponse(body, error instanceof Error ? error.message : "Analytics API unavailable");
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Analytics API unavailable" },
      { status: 502 }
    );
  }
}

function mockResponse(body: WidgetDataRequest, fallbackReason?: string) {
  return NextResponse.json({
    ok: true,
    data: runWidgetQuery(body.queryKey, body.config ?? {}, body.context),
    meta: {
      source: "mock",
      availability: "available",
      fallbackReason
    }
  });
}

function analyticsDataMode(): DataMode {
  const configured = process.env.ANALYTICS_DATA_MODE;
  if (configured === "mock" || configured === "sql" || configured === "fallback") return configured;
  return process.env.NODE_ENV === "production" ? "sql" : "fallback";
}

function apiBaseUrl() {
  return process.env.ANALYTICS_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
}
