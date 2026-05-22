"use client";

import { Download, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ExportControls({ label = "Export" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        CSV
      </Button>
      <Button variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </div>
  );
}
