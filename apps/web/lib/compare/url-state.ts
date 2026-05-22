import { defaultDashboardState, ensureContextPair } from "@/lib/compare/defaults";
import type { DashboardState } from "@/lib/widgets/types";

const PARAM_NAME = "compare";

export function readDashboardStateFromUrl() {
  if (typeof window === "undefined") return null;

  const encoded = new URLSearchParams(window.location.search).get(PARAM_NAME);
  if (!encoded) return null;

  try {
    return ensureContextPair({
      ...defaultDashboardState,
      ...(JSON.parse(decodeURIComponent(atob(encoded))) as Partial<DashboardState>)
    });
  } catch {
    return null;
  }
}

export function writeDashboardStateToUrl(state: DashboardState) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const encoded = btoa(encodeURIComponent(JSON.stringify(state)));
  url.searchParams.set(PARAM_NAME, encoded);
  window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
}
