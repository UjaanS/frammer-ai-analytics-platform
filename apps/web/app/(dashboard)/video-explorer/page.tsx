"use client";

import { WarehouseExplorer } from "@/components/analytics/warehouse-explorer";
import { PageHeader } from "@/components/analytics/page-header";
import { PageTransition } from "@/components/analytics/page-transition";
import { PageContainer } from "@/components/shell/page-container";

export default function VideoExplorerPage() {
  return (
    <PageTransition>
      <PageContainer>
        <PageHeader
          title="Video Explorer"
          description="Search, sort, filter, export, and inspect every source video and generated output record."
        />
        <WarehouseExplorer />
      </PageContainer>
    </PageTransition>
  );
}
