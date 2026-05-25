import { NextResponse } from "next/server";

import { videoRecords } from "@/lib/analytics/mock-data";

export function GET() {
  return NextResponse.json({
    data: videoRecords,
    count: videoRecords.length
  });
}
