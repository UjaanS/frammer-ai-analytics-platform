"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { videoRecords } from "@/lib/analytics/mock-data";
import type { VideoRecord } from "@/lib/analytics/types";

export function ChannelDrilldown({ records: sourceRecords = videoRecords }: { records?: VideoRecord[] }) {
  const channels = Array.from(new Set(sourceRecords.map((record) => record.channel)));
  const [selectedChannel, setSelectedChannel] = useState(channels[0] ?? "");

  useEffect(() => {
    if (!channels.includes(selectedChannel)) {
      setSelectedChannel(channels[0] ?? "");
    }
  }, [channels, selectedChannel]);

  const records = sourceRecords.filter((record) => record.channel === selectedChannel);
  const published = records.filter((record) => record.publishedStatus === "Published").length;
  const downloads = records.reduce((sum, record) => sum + record.downloads, 0);
  const latency = Math.round(
    records.reduce((sum, record) => sum + record.processingMinutes, 0) / Math.max(1, records.length)
  );

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Channel Drilldown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {channels.map((channel) => (
            <button
              key={channel}
              onClick={() => setSelectedChannel(channel)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                selectedChannel === channel
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {channel}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["Records", records.length],
            ["Published", published],
            ["Downloads", downloads.toLocaleString()],
            ["Avg latency", `${latency}m`]
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
