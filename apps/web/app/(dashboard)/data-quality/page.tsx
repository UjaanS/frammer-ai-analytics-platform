"use client";

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
import { useSqlAnalyticsRecords } from "@/hooks/use-sql-analytics-records";
import { useWidgetData } from "@/lib/widgets/use-widget-data";

export default function DataQualityPage() {
  const { records } = useSqlAnalyticsRecords();
  const qualityScore = calculateQualityScore(records);
  const issueMix = aggregateByDimension(records, "qualityFlag", "uploaded").filter((item) => item.name !== "Clean");
  const issueChannels = aggregateByDimension(records.filter((record) => record.qualityFlag !== "Clean"), "channel", "qualityIssues");
  const { data: trendRows = [] } = useWidgetData<Array<Record<string, string | number>>>("timeTrend", { timeGroup: "month" });
  const trendData = trendRows.map((row) => ({
    date: String(row.label ?? ""),
    uploads: Number(row.uploaded ?? 0),
    processed: Number(row.processed ?? 0),
    published: Number(row.published ?? 0),
    downloads: 0,
    duration: Number(row.uploadedDuration ?? 0),
    previous: 0
  }));
  const issueCount = (name: string) => issueMix.find((item) => item.name === name)?.value ?? 0;
  const anomalyAlerts = issueMix.slice(0, 3).map((issue) => ({
    title: issue.name,
    description: `${issue.value} warehouse video rows currently carry this quality flag.`,
    impact: "Warehouse",
    tone: "warning" as const
  }));

  return (
    <PageTransition>
      <PageContainer>
        <PageHeader
          title="Data Quality Dashboard"
          description="Monitor missing fields, duplicate IDs, invalid URLs, unknown mappings, failed jobs, and quality score movement."
        />

        <ResponsiveGrid minColumnWidth="sm">
          <MetricCard title="Quality Score" value={`${qualityScore}%`} description="Weighted record health" icon={BadgeCheck} />
          <MetricCard title="Missing Fields" value={issueCount("Missing metadata").toLocaleString()} description="Metadata and language gaps" icon={AlertTriangle} />
          <MetricCard title="Unknown Mapping" value={issueCount("Unknown mapping").toLocaleString()} description="Undocumented source status values" icon={Bug} />
          <MetricCard title="Invalid URLs" value={issueCount("Invalid URL").toLocaleString()} description="Source links requiring repair" icon={Link2Off} />
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
            <UnifiedTrendChart data={trendData} comparison={false} />
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

        <MultiDimensionPanel records={records} />
      </PageContainer>
    </PageTransition>
  );
}
