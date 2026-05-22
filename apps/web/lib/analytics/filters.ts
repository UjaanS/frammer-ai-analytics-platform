import type { DimensionKey, FilterState, MetricKey } from "./types";

export const defaultFilters: FilterState = {
  dateRange: "last-30-days",
  comparisonRange: "previous-period",
  company: "all",
  channel: "all",
  users: [],
  language: "all",
  platform: "all",
  publishedStatus: "all",
  inputType: "all",
  outputType: "all",
  dimension1: "channel",
  dimension2: "language",
  metric: "published",
  billableStatus: "all",
  dataQualityFlags: []
};

export const dateRangeOptions = [
  { value: "last-7-days", label: "Last 7 days" },
  { value: "last-30-days", label: "Last 30 days" },
  { value: "quarter-to-date", label: "Quarter to date" },
  { value: "year-to-date", label: "Year to date" }
];

export const comparisonRangeOptions = [
  { value: "previous-period", label: "Previous period" },
  { value: "previous-year", label: "Previous year" },
  { value: "none", label: "No comparison" }
];

export function parseFilters(searchParams: { get: (name: string) => string | null }): FilterState {
  return {
    ...defaultFilters,
    dateRange: searchParams.get("dateRange") ?? defaultFilters.dateRange,
    comparisonRange: searchParams.get("comparisonRange") ?? defaultFilters.comparisonRange,
    company: searchParams.get("company") ?? defaultFilters.company,
    channel: searchParams.get("channel") ?? defaultFilters.channel,
    users: splitParam(searchParams.get("users")),
    language: searchParams.get("language") ?? defaultFilters.language,
    platform: searchParams.get("platform") ?? defaultFilters.platform,
    publishedStatus: searchParams.get("publishedStatus") ?? defaultFilters.publishedStatus,
    inputType: searchParams.get("inputType") ?? defaultFilters.inputType,
    outputType: searchParams.get("outputType") ?? defaultFilters.outputType,
    dimension1: (searchParams.get("dimension1") as DimensionKey) ?? defaultFilters.dimension1,
    dimension2: (searchParams.get("dimension2") as DimensionKey) ?? defaultFilters.dimension2,
    metric: (searchParams.get("metric") as MetricKey) ?? defaultFilters.metric,
    billableStatus: searchParams.get("billableStatus") ?? defaultFilters.billableStatus,
    dataQualityFlags: splitParam(searchParams.get("dataQualityFlags"))
  };
}

export function filterChips(filters: FilterState) {
  return Object.entries(filters)
    .filter(([key, value]) => {
      const defaultValue = defaultFilters[key as keyof FilterState];
      if (Array.isArray(value)) return value.length > 0;
      return value !== defaultValue;
    })
    .map(([key, value]) => ({
      key,
      label: key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()),
      value: Array.isArray(value) ? value.join(", ") : String(value)
    }));
}

function splitParam(value: string | null) {
  return value ? value.split(",").filter(Boolean) : [];
}
