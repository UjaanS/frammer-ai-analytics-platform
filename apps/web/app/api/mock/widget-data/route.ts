// Unified widget-data endpoint. Today: runs the same pure builders the
// frontend used to call synchronously. Tomorrow: this is the single place
// to plug in a real backend — change the body of POST() and every widget
// gets real data for free.

import { NextResponse } from "next/server";

import { runWidgetQuery } from "@/lib/widgets/dashboard-data";
import type { DashboardContext, WidgetConfig, WidgetQueryKey } from "@/lib/widgets/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WidgetDataRequest = {
  queryKey: WidgetQueryKey;
  config: WidgetConfig;
  context?: DashboardContext;
};

export async function POST(request: Request) {
  let body: WidgetDataRequest;
  try {
    body = (await request.json()) as WidgetDataRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { queryKey, config, context } = body;
  if (!queryKey) {
    return NextResponse.json({ ok: false, error: "Missing queryKey" }, { status: 400 });
  }

  const data = runWidgetQuery(queryKey, config ?? {}, context);
  return NextResponse.json({ ok: true, data });
}
