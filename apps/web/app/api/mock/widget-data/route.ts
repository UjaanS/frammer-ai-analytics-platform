// Backward-compatible alias retained for saved clients and older previews.
// New widgets call /api/analytics/widget-data.
import { handleWidgetDataRequest } from "@/lib/analytics/widget-data-bff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleWidgetDataRequest;
