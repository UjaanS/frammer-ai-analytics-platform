"use client";

import { AlertTriangle, Clock, TrendingDown } from "lucide-react";

import { AnomalyBanner } from "@/components/analytics/anomaly-banner";
import { MultiDimensionPanel } from "@/components/analytics/multi-dimension-panel";
import { PageHeader } from "@/components/analytics/page-header";
import { PageTransition } from "@/components/analytics/page-transition";
import { ChartFrame } from "@/components/charts/chart-frame";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { MetricCard } from "@/components/shell/metric-card";
import { PageContainer } from "@/components/shell/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateByDimension } from "@/lib/analytics/engine";
import { useSqlAnalyticsRecords } from "@/hooks/use-sql-analytics-records";
import { useWidgetData } from "@/lib/widgets/use-widget-data";

export default function PublishingFunnelPage() {
  const { records } = useSqlAnalyticsRecords();
  const { data: summary = {} } = useWidgetData<Record<string, number>>("summary", {});
  const lowChannels = aggregateByDimension(records, "channel", "published").slice(-4).reverse();
  const uploaded = summary.videosIngested ?? 0;
  const processed = summary.processed ?? 0;
  const published = summary.published ?? 0;
  const processedRate = percent(processed, uploaded);
  const publishedRate = percent(published, processed);
  const funnelSteps = [
    { label: "Uploaded", value: uploaded, conversion: 100, latency: "Ingested originals" },
    { label: "Processed", value: processed, conversion: processedRate, latency: `${summary.processingTurnaround ?? 0} min avg` },
    { label: "Published", value: published, conversion: publishedRate, latency: "Published snapshot rows" }
  ];
  const bottlenecks = [
    { title: "Processing backlog", description: `${summary.processingBacklog ?? 0} original videos remain queued or in progress.`, impact: "Warehouse", tone: "warning" as const },
    { title: "Service backlog", description: `${summary.serviceBacklog ?? 0} service requests remain queued or in progress.`, impact: "Warehouse", tone: "warning" as const }
  ];

  return (
    <PageTransition>
      <PageContainer>
        <PageHeader
          title="Publishing Funnel"
          description="Track the complete Uploaded to Processed to Published to Downloaded path with conversion, latency, and dropoff indicators."
        />

        <ResponsiveGrid minColumnWidth="sm">
          <MetricCard title="Upload to Processed" value={`${processedRate}%`} description={`${Math.max(0, uploaded - processed)} videos pending or failed`} icon={TrendingDown} />
          <MetricCard title="Processed to Published" value={`${publishedRate}%`} description={`${Math.max(0, processed - published)} videos not published`} icon={AlertTriangle} />
          <MetricCard title="Avg Processing" value={`${summary.processingTurnaround ?? 0}m`} description="Warehouse turnaround metric" icon={Clock} />
          <MetricCard title="Downloads / Published" value="Unavailable" description="No trustworthy download source in snapshot" icon={TrendingDown} />
        </ResponsiveGrid>

        <AnomalyBanner alerts={bottlenecks} />

        <ResponsiveGrid minColumnWidth="lg">
          <ChartFrame title="Publishing Funnel" description="Conversion and latency by funnel stage.">
            <FunnelChart steps={funnelSteps} />
          </ChartFrame>
          <ChartFrame title="Low-Performing Channels" description="Channels with the lowest published output volume.">
            <HorizontalBarChart data={lowChannels} />
          </ChartFrame>
        </ResponsiveGrid>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Dropoff Diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {[
              ["Uploaded to Processed", `${Math.max(0, 100 - processedRate)}% dropoff`, "Derived from warehouse processing status."],
              ["Processed to Published", `${Math.max(0, 100 - publishedRate)}% dropoff`, "Derived from warehouse publish state."],
              ["Published to Downloaded", "Unavailable", "The SQL snapshot has no trustworthy download totals."]
            ].map(([title, value, detail]) => (
              <div key={title} className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <MultiDimensionPanel records={records} />
      </PageContainer>
    </PageTransition>
  );
}

function percent(numerator: number, denominator: number) {
  return Math.round(numerator / Math.max(1, denominator) * 1000) / 10;
}
