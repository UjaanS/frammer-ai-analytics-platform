import { NextResponse } from "next/server";

import { aggregateByDimension } from "@/lib/analytics/engine";
import { anomalyAlerts, insights, kpiMetrics, trendData, videoRecords } from "@/lib/analytics/mock-data";

export function GET() {
  return NextResponse.json({
    kpis: kpiMetrics,
    insights,
    anomalies: anomalyAlerts,
    trends: trendData,
    outputMix: aggregateByDimension(videoRecords, "outputType", "published"),
    topChannels: aggregateByDimension(videoRecords, "channel", "published")
  });
}
