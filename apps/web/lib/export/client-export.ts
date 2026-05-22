"use client";

import { toPng } from "html-to-image";

export async function exportElementAsPng(element: HTMLElement, filename: string) {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === "true")
  });
  downloadDataUrl(dataUrl, filename);
}

export async function copyElementAsImage(element: HTMLElement) {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === "true")
  });
  const blob = await (await fetch(dataUrl)).blob();

  if (navigator.clipboard && "ClipboardItem" in window) {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return;
  }

  downloadDataUrl(dataUrl, "frammer-chart.png");
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number | boolean | undefined>>) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => JSON.stringify(String(row[header] ?? "")))
        .join(",")
    )
  ].join("\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
