import { proxyAnalyticsGet } from "@/lib/analytics/analytics-bff";

export const dynamic = "force-dynamic";

export function GET() {
  return proxyAnalyticsGet("/analytics/warehouse/catalog");
}
