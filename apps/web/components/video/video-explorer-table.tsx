"use client";

import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Download, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { VideoRecord } from "@/lib/analytics/types";

const columns: ColumnDef<VideoRecord>[] = [
  { accessorKey: "id", header: "Video ID" },
  { accessorKey: "title", header: "Title" },
  { accessorKey: "company", header: "Company" },
  { accessorKey: "channel", header: "Channel" },
  { accessorKey: "user", header: "User" },
  { accessorKey: "language", header: "Language" },
  { accessorKey: "platform", header: "Platform" },
  { accessorKey: "publishedStatus", header: "Status" },
  { accessorKey: "inputType", header: "Input" },
  { accessorKey: "outputType", header: "Output" },
  {
    accessorKey: "durationMinutes",
    header: "Duration",
    cell: ({ row }) => `${row.original.durationMinutes}m`
  },
  {
    accessorKey: "downloads",
    header: "Downloads",
    cell: ({ row }) => row.original.downloads.toLocaleString()
  },
  {
    accessorKey: "qualityScore",
    header: "Quality",
    cell: ({ row }) => `${row.original.qualityScore}%`
  }
];

export function VideoExplorerTable({ data }: { data: VideoRecord[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    platform: false,
    inputType: false
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [showColumns, setShowColumns] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      globalFilter
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const visibleColumnLabels = useMemo(
    () => table.getAllLeafColumns().filter((column) => column.getCanHide()),
    [table]
  );

  function exportCsv() {
    const visibleColumns = table.getVisibleLeafColumns();
    const headers = visibleColumns.map((column) => String(column.columnDef.header));
    const rows = table.getFilteredRowModel().rows.map((row) =>
      visibleColumns.map((column) => JSON.stringify(row.getValue(column.id) ?? "")).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "frammer-video-explorer.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Search video title, user, channel, ID..."
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <input
          placeholder="Semantic search UI placeholder"
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowColumns((value) => !value)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Columns
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {showColumns ? (
        <div className="flex flex-wrap gap-3 rounded-lg border bg-card p-3">
          {visibleColumnLabels.map((column) => (
            <label key={column.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={column.getIsVisible()}
                onChange={column.getToggleVisibilityHandler()}
              />
              {String(column.columnDef.header)}
            </label>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    <button
                      className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="max-w-[22rem] truncate">
                    {cell.column.columnDef.cell
                      ? flexRender(cell.column.columnDef.cell, cell.getContext())
                      : String(cell.getValue() ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ·{" "}
          {table.getFilteredRowModel().rows.length} videos
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
