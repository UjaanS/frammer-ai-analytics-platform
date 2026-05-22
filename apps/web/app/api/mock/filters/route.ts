import { NextResponse } from "next/server";

import {
  billableStatuses,
  channels,
  companies,
  dimensionOptions,
  inputTypes,
  languages,
  metricOptions,
  outputTypes,
  platforms,
  publishedStatuses,
  qualityFlags,
  users
} from "@/lib/analytics/mock-data";

export function GET() {
  return NextResponse.json({
    companies,
    channels,
    users,
    languages,
    platforms,
    publishedStatuses,
    inputTypes,
    outputTypes,
    billableStatuses,
    qualityFlags,
    dimensions: dimensionOptions,
    metrics: metricOptions
  });
}
