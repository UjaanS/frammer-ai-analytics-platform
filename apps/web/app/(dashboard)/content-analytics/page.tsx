import { MultiDimensionPanel } from "@/components/analytics/multi-dimension-panel";
import { PageHeader } from "@/components/analytics/page-header";
import { PageTransition } from "@/components/analytics/page-transition";
import { ChartFrame } from "@/components/charts/chart-frame";
import { DonutChart } from "@/components/charts/donut-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { StackedBarChart } from "@/components/charts/stacked-bar-chart";
import { TreemapChart } from "@/components/charts/treemap-chart";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { PageContainer } from "@/components/shell/page-container";
import { aggregateByDimension } from "@/lib/analytics/engine";
import { channels, outputTypes, videoRecords } from "@/lib/analytics/mock-data";

const stackedContent = channels.map((channel, index) => ({
  name: channel,
  Reels: 22 + index * 4,
  Shorts: 30 - index * 2,
  Summaries: 14 + index * 3
}));

const heatmapValues = outputTypes.map((_, row) =>
  channels.map((__, column) => 12 + ((row + 2) * (column + 3)) % 34)
);

export default function ContentAnalyticsPage() {
  const outputMix = aggregateByDimension(videoRecords, "outputType", "uploaded");
  const inputTrends = aggregateByDimension(videoRecords, "inputType", "processed");
  const treemapData = outputMix.map((item) => ({ name: item.name, size: item.value + item.count * 3 }));

  return (
    <PageTransition>
      <PageContainer>
        <PageHeader
          title="Content Analytics"
          description="Analyze output formats, input sources, creative mixes, and content shape across channels."
        />

        <ResponsiveGrid minColumnWidth="lg">
          <ChartFrame title="Output Type Mix" description="Reels, shorts, summaries, carousels, and transcripts.">
            <DonutChart data={outputMix} />
          </ChartFrame>
          <ChartFrame title="Input Type Trends" description="Processing volume by source content type.">
            <HorizontalContent data={inputTrends} />
          </ChartFrame>
          <ChartFrame title="Reels vs Shorts vs Summaries" description="Stacked mix by channel.">
            <StackedBarChart data={stackedContent} keys={["Reels", "Shorts", "Summaries"]} />
          </ChartFrame>
          <ChartFrame title="Content Treemap" description="Relative output footprint.">
            <TreemapChart data={treemapData} />
          </ChartFrame>
        </ResponsiveGrid>

        <ChartFrame title="Channel x Output Heatmap" description="High intensity cells reveal concentrated content workflows.">
          <Heatmap rows={outputTypes} columns={channels} values={heatmapValues} />
        </ChartFrame>

        <MultiDimensionPanel />
      </PageContainer>
    </PageTransition>
  );
}

function HorizontalContent({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.name} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{item.name}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, item.value * 8)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
