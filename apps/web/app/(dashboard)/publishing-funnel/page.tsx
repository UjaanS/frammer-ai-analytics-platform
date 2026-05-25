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
import { videoRecords } from "@/lib/analytics/mock-data";

const funnelSteps = [
  { label: "Uploaded", value: 2842, conversion: 100, latency: "0 min" },
  { label: "Processed", value: 2594, conversion: 91.3, latency: "18 min" },
  { label: "Published", value: 1876, conversion: 72.3, latency: "42 min" },
  { label: "Downloaded", value: 5216, conversion: 277.9, latency: "6 hr window" }
];

const bottlenecks = [
  { title: "Processing queue saturation", description: "Bulk Upload jobs are adding 11 minutes to median processing latency.", impact: "High", tone: "warning" as const },
  { title: "Publishing approval delay", description: "Draft to published movement is slowest for TikTok and Newsletter outputs.", impact: "Medium", tone: "warning" as const }
];

export default function PublishingFunnelPage() {
  const lowChannels = aggregateByDimension(videoRecords, "channel", "published").slice(-4).reverse();

  return (
    <PageTransition>
      <PageContainer>
        <PageHeader
          title="Publishing Funnel"
          description="Track the complete Uploaded to Processed to Published to Downloaded path with conversion, latency, and dropoff indicators."
        />

        <ResponsiveGrid minColumnWidth="sm">
          <MetricCard title="Upload to Processed" value="91.3%" description="248 videos dropped" icon={TrendingDown} />
          <MetricCard title="Processed to Published" value="72.3%" description="718 videos pending or failed" icon={AlertTriangle} />
          <MetricCard title="Median Latency" value="42m" description="Upload to publish" icon={Clock} />
          <MetricCard title="Downloads / Published" value="2.8x" description="Strong reuse rate" icon={TrendingDown} />
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
              ["Uploaded to Processed", "8.7% dropoff", "Mostly failed jobs and invalid URLs."],
              ["Processed to Published", "27.7% dropoff", "Approval queue and draft backlog."],
              ["Published to Downloaded", "Healthy", "Downloads are exceeding published volume."]
            ].map(([title, value, detail]) => (
              <div key={title} className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <MultiDimensionPanel />
      </PageContainer>
    </PageTransition>
  );
}
