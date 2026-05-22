import { AlertTriangle, BadgeCheck, Bug, Link2Off } from "lucide-react";

import { AnomalyBanner } from "@/components/analytics/anomaly-banner";
import { MultiDimensionPanel } from "@/components/analytics/multi-dimension-panel";
import { PageHeader } from "@/components/analytics/page-header";
import { PageTransition } from "@/components/analytics/page-transition";
import { ChartFrame } from "@/components/charts/chart-frame";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { UnifiedTrendChart } from "@/components/charts/unified-trend-chart";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { MetricCard } from "@/components/shell/metric-card";
import { PageContainer } from "@/components/shell/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateByDimension, calculateQualityScore } from "@/lib/analytics/engine";
import { anomalyAlerts, trendData, videoRecords } from "@/lib/analytics/mock-data";

export default function DataQualityPage() {
  const qualityScore = calculateQualityScore(videoRecords);
  const issueMix = aggregateByDimension(videoRecords, "qualityFlag", "uploaded").filter((item) => item.name !== "Clean");
  const issueChannels = aggregateByDimension(videoRecords.filter((record) => record.qualityFlag !== "Clean"), "channel", "qualityIssues");

  return (
    <PageTransition>
      <PageContainer>
        <PageHeader
          title="Data Quality Dashboard"
          description="Monitor missing fields, duplicate IDs, invalid URLs, unknown mappings, failed jobs, and quality score movement."
        />

        <ResponsiveGrid minColumnWidth="sm">
          <MetricCard title="Quality Score" value={`${qualityScore}%`} description="Weighted record health" icon={BadgeCheck} />
          <MetricCard title="Missing Fields" value="24" description="Metadata and language gaps" icon={AlertTriangle} />
          <MetricCard title="Duplicate IDs" value="18" description="Source ID conflicts" icon={Bug} />
          <MetricCard title="Invalid URLs" value="11" description="Source links requiring repair" icon={Link2Off} />
        </ResponsiveGrid>

        <AnomalyBanner alerts={anomalyAlerts} />

        <ResponsiveGrid minColumnWidth="lg">
          <ChartFrame title="Issue Mix" description="Data quality issue distribution.">
            <DonutChart data={issueMix} />
          </ChartFrame>
          <ChartFrame title="Issue Concentration by Channel" description="Quality issues by channel.">
            <HorizontalBarChart data={issueChannels} />
          </ChartFrame>
          <ChartFrame title="Quality Trend Monitoring" description="Quality score proxy across the active period.">
            <UnifiedTrendChart data={trendData.map((point) => ({ ...point, uploads: 90 + (point.published % 8), processed: 92, published: 88 }))} comparison={false} />
          </ChartFrame>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Severity Indicators</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Critical", "Failed jobs and duplicate IDs", "bg-destructive/10 text-destructive"],
                ["Warning", "Missing metadata and unknown mappings", "bg-amber-500/10 text-amber-700 dark:text-amber-200"],
                ["Healthy", "Clean records with valid source URLs", "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"]
              ].map(([label, detail, className]) => (
                <div key={label} className={`rounded-lg p-4 ${className}`}>
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm opacity-80">{detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </ResponsiveGrid>

        <MultiDimensionPanel />
      </PageContainer>
    </PageTransition>
  );
}
