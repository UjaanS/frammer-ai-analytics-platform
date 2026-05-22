import { ChannelDrilldown } from "@/components/analytics/channel-drilldown";
import { MultiDimensionPanel } from "@/components/analytics/multi-dimension-panel";
import { PageHeader } from "@/components/analytics/page-header";
import { PageTransition } from "@/components/analytics/page-transition";
import { ChartFrame } from "@/components/charts/chart-frame";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { ResponsiveGrid } from "@/components/layout/responsive-grid";
import { PageContainer } from "@/components/shell/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateByDimension } from "@/lib/analytics/engine";
import { videoRecords } from "@/lib/analytics/mock-data";

export default function ChannelUserAnalyticsPage() {
  const channelRanking = aggregateByDimension(videoRecords, "channel", "published");
  const userContribution = aggregateByDimension(videoRecords, "user", "uploaded");
  const languageBreakdown = aggregateByDimension(videoRecords, "language", "published");
  const platformDistribution = aggregateByDimension(videoRecords, "platform", "uploaded");
  const lowPerformers = channelRanking.slice(-3).reverse();

  return (
    <PageTransition>
      <PageContainer>
        <PageHeader
          title="Channel / User Analytics"
          description="Understand which channels, contributors, languages, and platforms are driving or constraining publishing outcomes."
        />

        <ResponsiveGrid minColumnWidth="lg">
          <ChartFrame title="Channel Ranking" description="Published outputs by channel.">
            <HorizontalBarChart data={channelRanking} />
          </ChartFrame>
          <ChartFrame title="User Contribution" description="Upload ownership across the team.">
            <HorizontalBarChart data={userContribution.slice(0, 6)} />
          </ChartFrame>
          <ChartFrame title="Language Breakdown" description="Published volume by language.">
            <DonutChart data={languageBreakdown.slice(0, 6)} />
          </ChartFrame>
          <ChartFrame title="Platform Distribution" description="Source platform mix.">
            <DonutChart data={platformDistribution.slice(0, 5)} />
          </ChartFrame>
        </ResponsiveGrid>

        <ResponsiveGrid minColumnWidth="md">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {channelRanking.slice(0, 3).map((item) => (
                <div key={item.name} className="rounded-lg bg-muted/50 p-4">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.value} published outputs · drilldown ready</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Low Performers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowPerformers.map((item) => (
                <div key={item.name} className="rounded-lg bg-amber-500/10 p-4 text-amber-900 dark:text-amber-100">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm opacity-80">Lower conversion pattern. Open drilldown to inspect workflow latency.</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </ResponsiveGrid>

        <ChannelDrilldown />
        <MultiDimensionPanel />
      </PageContainer>
    </PageTransition>
  );
}
