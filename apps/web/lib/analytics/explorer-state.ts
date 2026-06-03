import type { WarehouseQueryRequest } from "@/lib/analytics/warehouse";

const QUERY_PARAM = "warehouse";

export function serializeExplorerQuery(query: WarehouseQueryRequest) {
  const params = new URLSearchParams();
  params.set(QUERY_PARAM, JSON.stringify(query));
  return params.toString();
}

export function readExplorerQuery(search: string): WarehouseQueryRequest | undefined {
  const raw = new URLSearchParams(search).get(QUERY_PARAM);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as WarehouseQueryRequest;
    return parsed && typeof parsed === "object" && typeof parsed.dataset === "string"
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}
