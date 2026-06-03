"use client";

import { useSearchParams } from "next/navigation";

import { WarehouseExplorer } from "@/components/analytics/warehouse-explorer";
import { PageHeader } from "@/components/analytics/page-header";
import { PageTransition } from "@/components/analytics/page-transition";
import { PageContainer } from "@/components/shell/page-container";
import { readExplorerQuery } from "@/lib/analytics/explorer-state";

export default function VideoExplorerPage() {
  const searchParams = useSearchParams();
  const initialQuery = readExplorerQuery(searchParams.toString());
  return (
    <PageTransition>
      <PageContainer>
        <PageHeader
          title="Video Explorer"
          description="Search, sort, filter, export, and inspect every source video and generated output record."
        />
        <WarehouseExplorer initialQuery={initialQuery} />
      </PageContainer>
    </PageTransition>
  );
}
