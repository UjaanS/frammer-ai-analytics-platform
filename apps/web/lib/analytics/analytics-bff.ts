import { NextResponse } from "next/server";

export async function proxyAnalyticsGet(path: string, search = "") {
  try {
    const response = await fetch(`${apiBaseUrl()}${path}${search}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Analytics API returned ${response.status}`);
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Analytics API unavailable" },
      { status: 502 }
    );
  }
}

export async function proxyAnalyticsPost(path: string, request: Request) {
  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store"
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Analytics API unavailable" },
      { status: 502 }
    );
  }
}

function apiBaseUrl() {
  return process.env.ANALYTICS_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
}
