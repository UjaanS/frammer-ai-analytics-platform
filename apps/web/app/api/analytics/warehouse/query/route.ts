import { proxyAnalyticsPost } from "@/lib/analytics/analytics-bff";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return proxyAnalyticsPost("/analytics/warehouse/query", request);
}
