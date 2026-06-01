"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/analytics/page-header";
import { PageTransition } from "@/components/analytics/page-transition";
import { MultiDimensionPanel } from "@/components/analytics/multi-dimension-panel";
import { ChartFrame } from "@/components/charts/chart-frame";
import { StackedBarChart } from "@/components/charts/stacked-bar-chart";
import { UnifiedTrendChart } from "@/components/charts/unified-trend-chart";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { MetricCard } from "@/components/shell/metric-card";
import { PageContainer } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";
import { useSqlAnalyticsRecords } from "@/hooks/use-sql-analytics-records";
import { useWidgetData } from "@/lib/widgets/use-widget-data";
import type { TrendPoint } from "@/lib/analytics/types";
import { Activity, Clock, TrendingUp, Video } from "lucide-react";

export default function UsageTrendsPage() {
  const [mode, setMode] = useState<"count" | "duration">("count");
  const [comparison, setComparison] = useState(true);
  const [grouping, setGrouping] = useState("day");
  const { records } = useSqlAnalyticsRecords();
  const { data: trendRows = [] } = useWidgetData<Array<Record<string, string | number>>>("timeTrend", { timeGroup: grouping as "day" | "month" | "year" });
  const trendData = trendRows.map(toTrendPoint);
  const stackedData = trendData.slice(0, 12).map((point) => ({
    name: point.date,
    Uploads: point.uploads,
    Processed: point.processed,
    Published: point.published
  }));

  const summary = useMemo(() => {
    const uploads = trendData.reduce((sum, item) => sum + item.uploads, 0);
    const duration = trendData.reduce((sum, item) => sum + item.duration, 0);
    const published = trendData.reduce((sum, item) => sum + item.published, 0);
    return { uploads, duration, published };
  }, [trendData]);

  return (
    <PageTransition>
      <PageContainer>
        <PageHeader
          title="Usage & Trends"
          description="Monitor volume, growth, seasonality, processing throughput, and period-over-period movement."
        />

        <ResponsiveGrid minColumnWidth="sm">
          <MetricCard title="Uploads" value={summary.uploads.toLocaleString()} description="Across selected period" icon={Video} />
          <MetricCard title="Published" value={summary.published.toLocaleString()} description="Period output volume" icon={Activity} />
          <MetricCard title="Duration" value={`${Math.round(summary.duration / 60).toLocaleString()}h`} description="Total source duration" icon={Clock} />
          <MetricCard title="Growth" value="Unavailable" description="Select two periods to calculate growth" icon={TrendingUp} />
        </ResponsiveGrid>

        <ChartFrame
          title="Unified Time Trend"
          description="Switch between counts and duration with optional period comparison."
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={mode === "count" ? "default" : "outline"} onClick={() => setMode("count")}>Count</Button>
              <Button size="sm" variant={mode === "duration" ? "default" : "outline"} onClick={() => setMode("duration")}>Duration</Button>
              {["day", "month", "year"].map((item) => (
                <Button key={item} size="sm" variant={grouping === item ? "secondary" : "ghost"} onClick={() => setGrouping(item)}>
                  {item}
                </Button>
              ))}
              <Button size="sm" variant={comparison ? "outline" : "ghost"} onClick={() => setComparison((value) => !value)}>
                Compare
              </Button>
            </div>
          }
        >
          <UnifiedTrendChart data={trendData} mode={mode} comparison={comparison} />
        </ChartFrame>

        <ResponsiveGrid minColumnWidth="lg">
          <ChartFrame title="Uploads / Processed / Published" description="Stacked operational volume by day.">
            <StackedBarChart data={stackedData} keys={["Uploads", "Processed", "Published"]} />
          </ChartFrame>
          <ChartFrame title="Growth Trends" description={`Currently grouped by ${grouping}.`}>
            <UnifiedTrendChart data={trendData.slice(8)} mode="count" comparison={false} />
          </ChartFrame>
        </ResponsiveGrid>

        <MultiDimensionPanel records={records} />
      </PageContainer>
    </PageTransition>
  );
}

function toTrendPoint(row: Record<string, string | number>): TrendPoint {
  return {
    date: String(row.label ?? ""),
    uploads: Number(row.uploaded ?? 0),
    processed: Number(row.processed ?? 0),
    published: Number(row.published ?? 0),
    downloads: 0,
    duration: Number(row.uploadedDuration ?? 0),
    previous: 0
  };
}
