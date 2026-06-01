import type { NextRequest } from "next/server";

import { proxyAnalyticsGet } from "@/lib/analytics/analytics-bff";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return proxyAnalyticsGet("/analytics/data-quality", request.nextUrl.search);
}
