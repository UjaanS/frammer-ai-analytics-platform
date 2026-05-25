import { MultiDimensionPanel } from "@/components/analytics/multi-dimension-panel";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/analytics/page-header";
import { PageTransition } from "@/components/analytics/page-transition";
import { PageContainer } from "@/components/shell/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoExplorerTable } from "@/components/video/video-explorer-table";
import { videoRecords } from "@/lib/analytics/mock-data";

export default function VideoExplorerPage() {
  return (
    <PageTransition>
      <PageContainer>
        <PageHeader
          title="Video Explorer"
          description="Search, sort, filter, export, and inspect every source video and generated output record."
        />

        {videoRecords.length ? (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Advanced Searchable Table</CardTitle>
            </CardHeader>
            <CardContent>
              <VideoExplorerTable data={videoRecords} />
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={Search}
            title="No videos found"
            description="Adjust filters or broaden the selected date range to discover video records."
          />
        )}

        <MultiDimensionPanel />
      </PageContainer>
    </PageTransition>
  );
}
