"use client";

import { CalendarDays, Check, ChevronDown, PanelRightOpen, SlidersHorizontal, Sparkles, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { NlqInput } from "@/components/compare/nlq-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { channels, companies, inputTypes, publishedStatuses, users } from "@/lib/analytics/mock-data";
import { cn } from "@/lib/utils";
import type { DashboardContext, DateRange, ReportFilterState } from "@/lib/widgets/types";

export type NlqSubmit = (query: string) => Promise<{ summary: string }>;

const contextAccent: Record<string, { border: string; text: string; bg: string; glow: string }> = {
  "context-a": {
    border: "border-t-sky-400/80",
    text: "text-sky-200",
    bg: "bg-sky-400/10",
    glow: "shadow-sky-950/30"
  },
  "context-b": {
    border: "border-t-rose-400/80",
    text: "text-rose-200",
    bg: "bg-rose-400/10",
    glow: "shadow-rose-950/30"
  }
};

export function ContextFilterPanel({
  context,
  compact = false,
  onUpdateFilters,
  onUpdateDateRange,
  onNlqSubmit
}: {
  context: DashboardContext;
  compact?: boolean;
  onUpdateFilters: (contextId: string, filters: Partial<ReportFilterState>) => void;
  onUpdateDateRange: (contextId: string, dateRange: DateRange) => void;
  onNlqSubmit?: NlqSubmit;
}) {
  if (compact) {
    return (
      <ComparisonContextCard
        context={context}
        onUpdateFilters={onUpdateFilters}
        onUpdateDateRange={onUpdateDateRange}
      />
    );
  }

  return (
    <StandardContextHeader
      context={context}
      onUpdateFilters={onUpdateFilters}
      onUpdateDateRange={onUpdateDateRange}
      onNlqSubmit={onNlqSubmit}
    />
  );
}

function StandardContextHeader({
  context,
  onUpdateFilters,
  onUpdateDateRange,
  onNlqSubmit
}: {
  context: DashboardContext;
  onUpdateFilters: (contextId: string, filters: Partial<ReportFilterState>) => void;
  onUpdateDateRange: (contextId: string, dateRange: DateRange) => void;
  onNlqSubmit?: NlqSubmit;
}) {
  const [draftFilters, setDraftFilters] = useState(context.filters);
  const [draftDateRange, setDraftDateRange] = useState(context.dateRange);

  useEffect(() => {
    setDraftFilters(context.filters);
    setDraftDateRange(context.dateRange);
  }, [context]);

  function updateFilter<Key extends keyof ReportFilterState>(key: Key, value: ReportFilterState[Key]) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    onUpdateFilters(context.id, draftFilters);
    onUpdateDateRange(context.id, draftDateRange);
  }

  function removeFilter(key: keyof ReportFilterState) {
    const value = defaultFilterValue(key);
    const nextFilters = { ...context.filters, [key]: value };
    onUpdateFilters(context.id, { [key]: value });
    setDraftFilters(nextFilters);
  }

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-white/10 bg-white dark:bg-[#24283d]/95 shadow-xl shadow-black/20">
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#ef405b]">
              <Sparkles className="h-4 w-4" />
              Analytics Context
            </div>
            <h1 className="mt-2 truncate text-2xl font-black text-slate-900 dark:text-slate-100">
              {formatDateRangeLabel(context.dateRange)} · {context.filters.company} · {context.filters.channel}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Primary scope first. Power filters stay one click away.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-10 rounded-full border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#2d3147] px-4 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Advanced Filters
                </Button>
              </SheetTrigger>
              <FilterDrawer
                title="Advanced Filters"
                description="Refine users, content type, dimensions, and publish state without crowding the workspace."
                context={context}
                initialFilters={draftFilters}
                initialDateRange={draftDateRange}
                includePrimary={false}
                onApply={(filters, dateRange) => {
                  setDraftFilters(filters);
                  setDraftDateRange(dateRange);
                  onUpdateFilters(context.id, filters);
                  onUpdateDateRange(context.id, dateRange);
                }}
              />
            </Sheet>
            <Button className="h-10 rounded-full bg-[#d3455d] px-6 font-bold text-white hover:bg-[#e14e68]" onClick={applyFilters}>
              <Check className="mr-2 h-4 w-4" />
              Apply
            </Button>
          </div>
        </div>

        {onNlqSubmit ? (
          <div className="mt-5">
            <NlqInput onSubmit={onNlqSubmit} />
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.15fr_1fr_1fr_0.9fr]">
          <CompactDateRange value={draftDateRange} onChange={setDraftDateRange} />
          <CompactSelect label="Company" value={draftFilters.company} options={companyOptions} onChange={(value) => updateFilter("company", value)} />
          <CompactSelect label="Channel" value={draftFilters.channel} options={channelOptions} onChange={(value) => updateFilter("channel", value)} />
          <CompactSelect label="Compare" value={draftFilters.comparison} options={comparisonOptions} onChange={(value) => updateFilter("comparison", value)} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">Selected</span>
          {buildFilterChips(context).map((chip) => (
            <FilterChip key={chip.key} label={chip.label} tone={chip.tone} onRemove={chip.removable ? () => removeFilter(chip.key) : undefined} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonContextCard({
  context,
  onUpdateFilters,
  onUpdateDateRange
}: {
  context: DashboardContext;
  onUpdateFilters: (contextId: string, filters: Partial<ReportFilterState>) => void;
  onUpdateDateRange: (contextId: string, dateRange: DateRange) => void;
}) {
  const accent = contextAccent[context.id] ?? contextAccent["context-a"];
  const chips = buildFilterChips(context).slice(0, 4);

  return (
    <Card className={cn("overflow-hidden border border-slate-200 dark:border-white/10 border-t-2 bg-white dark:bg-[#24283d]/95 shadow-xl transition-all duration-300 hover:border-slate-300 dark:hover:border-white/20", accent.border, accent.glow)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide", accent.bg, accent.text)}>
              {context.label}
            </div>
            <h2 className="mt-3 truncate text-xl font-black text-slate-900 dark:text-slate-100">{formatDateRangeLabel(context.dateRange)}</h2>
            <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{context.filters.channel} · {labelFromValue(context.filters.user, userOptions)}</p>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-9 shrink-0 rounded-full border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#2d3147] px-4 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10">
                <PanelRightOpen className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </SheetTrigger>
            <FilterDrawer
              title={`Edit ${context.label}`}
              description="Tune this side of the comparison. Changes only affect this context unless sync is enabled."
              context={context}
              initialFilters={context.filters}
              initialDateRange={context.dateRange}
              includePrimary
              onApply={(filters, dateRange) => {
                onUpdateFilters(context.id, filters);
                onUpdateDateRange(context.id, dateRange);
              }}
            />
          </Sheet>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <FilterChip key={chip.key} label={chip.label} tone={chip.tone} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterDrawer({
  title,
  description,
  context,
  initialFilters,
  initialDateRange,
  includePrimary,
  onApply
}: {
  title: string;
  description: string;
  context: DashboardContext;
  initialFilters: ReportFilterState;
  initialDateRange: DateRange;
  includePrimary: boolean;
  onApply: (filters: ReportFilterState, dateRange: DateRange) => void;
}) {
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [draftDateRange, setDraftDateRange] = useState(initialDateRange);

  useEffect(() => {
    setDraftFilters(initialFilters);
    setDraftDateRange(initialDateRange);
  }, [initialDateRange, initialFilters]);

  function updateFilter<Key extends keyof ReportFilterState>(key: Key, value: ReportFilterState[Key]) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <SheetContent className="left-auto right-0 w-full max-w-xl overflow-y-auto border-l border-slate-200 dark:border-white/10 border-r-0 bg-white dark:bg-[#202337] p-0 text-slate-900 dark:text-slate-100 shadow-2xl">
      <div className="border-b border-slate-200 dark:border-white/10 p-6">
        <SheetTitle className="text-2xl font-black text-slate-900 dark:text-white">{title}</SheetTitle>
        <SheetDescription className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</SheetDescription>
      </div>

      <div className="space-y-6 p-6">
        {includePrimary ? (
          <DrawerSection title="Primary Scope">
            <div className="sm:col-span-2">
              <CompactDateRange value={draftDateRange} onChange={setDraftDateRange} />
            </div>
            <FilterSelect label="Company" value={draftFilters.company} options={companyOptions} onChange={(value) => updateFilter("company", value)} />
            <FilterSelect label="Channel" value={draftFilters.channel} options={channelOptions} onChange={(value) => updateFilter("channel", value)} />
            <FilterSelect label="Comparison" value={draftFilters.comparison} options={comparisonOptions} onChange={(value) => updateFilter("comparison", value)} />
          </DrawerSection>
        ) : null}

        <DrawerSection title="People & Content">
          <FilterSelect label="Users" value={draftFilters.user} options={userOptions} onChange={(value) => updateFilter("user", value)} />
          <FilterSelect label="Video Type" value={draftFilters.videoType} options={videoTypeOptions} onChange={(value) => updateFilter("videoType", value)} />
          <FilterSelect label="Published State" value={draftFilters.published} options={publishedOptions} onChange={(value) => updateFilter("published", value)} />
        </DrawerSection>

        <DrawerSection title="Segmentation">
          <FilterSelect label="Dimension" value={draftFilters.dimension} options={dimensionOptions} onChange={(value) => updateFilter("dimension", value)} />
          <FilterSelect label="Dimension Filter" value={draftFilters.dimensionFilter} options={dimensionFilterOptions} onChange={(value) => updateFilter("dimensionFilter", value)} />
        </DrawerSection>

        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
            <Sparkles className="h-4 w-4 text-[#ef405b]" />
            NLQ-ready context
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            This declarative context can later be populated from prompts like “Compare TikTok against YouTube for May.”
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#202337]/95 p-5 backdrop-blur">
        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">Editing {context.label}</div>
        <SheetClose asChild>
          <Button className="rounded-full bg-[#d3455d] px-7 font-bold text-white hover:bg-[#e14e68]" onClick={() => onApply(draftFilters, draftDateRange)}>
            <Check className="mr-2 h-4 w-4" />
            Apply Context
          </Button>
        </SheetClose>
      </div>
    </SheetContent>
  );
}

function CompactDateRange({ value, onChange }: { value: DateRange; onChange: (value: DateRange) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#2d3147] p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">
        <CalendarDays className="h-3.5 w-3.5" />
        Date
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <input
          type="date"
          value={value.start}
          onChange={(event) => onChange({ ...value, start: event.target.value })}
          className="h-8 min-w-0 rounded-md border border-transparent bg-transparent text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-[#ef405b]/40"
        />
        <span className="text-slate-400 dark:text-slate-500">–</span>
        <input
          type="date"
          value={value.end}
          onChange={(event) => onChange({ ...value, end: event.target.value })}
          className="h-8 min-w-0 rounded-md border border-transparent bg-transparent text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-[#ef405b]/40"
        />
      </div>
    </div>
  );
}

function CompactSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="group rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#2d3147] p-3 transition hover:border-slate-300 dark:hover:border-white/20">
      <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full bg-transparent text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#2d3147] px-3 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#ef405b] focus:ring-2 focus:ring-[#ef405b]/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function FilterChip({ label, tone = "neutral", onRemove }: { label: string; tone?: "neutral" | "primary"; onRemove?: () => void }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[18rem] animate-in fade-in-0 zoom-in-95 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition",
        tone === "primary" ? "bg-[#ef405b]/15 text-rose-100" : "bg-slate-100 dark:bg-white/[0.07] text-slate-700 dark:text-slate-300"
      )}
    >
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button type="button" onClick={onRemove} className="rounded-full p-0.5 text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white">
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}

function buildFilterChips(context: DashboardContext): Array<{ key: keyof ReportFilterState; label: string; removable?: boolean; tone?: "neutral" | "primary" }> {
  return [
    { key: "comparison", label: formatDateRangeLabel(context.dateRange), tone: "primary" },
    { key: "channel", label: context.filters.channel, tone: "primary" },
    { key: "user", label: labelFromValue(context.filters.user, userOptions), removable: context.filters.user !== "all" },
    { key: "videoType", label: labelFromValue(context.filters.videoType, videoTypeOptions), removable: context.filters.videoType !== "all" },
    { key: "published", label: labelFromValue(context.filters.published, publishedOptions), removable: context.filters.published !== "all" },
    ...(context.filters.dimension !== "none" ? [{ key: "dimension" as const, label: labelFromValue(context.filters.dimension, dimensionOptions), removable: true }] : [])
  ];
}

function formatDateRangeLabel(dateRange: DateRange) {
  const start = new Date(`${dateRange.start}T00:00:00`);
  const end = new Date(`${dateRange.end}T00:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth && start.getDate() === 1 && end.getDate() >= 28) {
    return start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  return `${dateRange.start} to ${dateRange.end}`;
}

function labelFromValue(value: string, options: Array<{ value: string; label: string }>) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function defaultFilterValue(key: keyof ReportFilterState) {
  const defaults: ReportFilterState = {
    comparison: "previous-period",
    company: "AAA - Frammer AI",
    channel: "Channel-Frammer AI",
    user: "all",
    videoType: "all",
    dimension: "none",
    dimensionFilter: "none",
    published: "all"
  };
  return defaults[key];
}

const comparisonOptions = [
  { value: "previous-period", label: "Previous period" },
  { value: "previous-month", label: "Previous month" },
  { value: "previous-year", label: "Previous year" },
  { value: "none", label: "No comparison" }
];

const companyOptions = ["AAA - Frammer AI", ...companies.filter((company) => company !== "Frammer AI")].map((company) => ({
  value: company,
  label: company
}));

const channelOptions = ["Channel-Frammer AI", ...channels].map((channel) => ({
  value: channel,
  label: channel
}));

const userOptions = [{ value: "all", label: "All users" }, ...users.map((user) => ({ value: user, label: user }))];

const videoTypeOptions = [
  { value: "all", label: "All video types" },
  ...inputTypes.map((type) => ({ value: type, label: type }))
];

const dimensionOptions = [
  { value: "none", label: "None" },
  { value: "channel", label: "Channel" },
  { value: "platform", label: "Platform" },
  { value: "user", label: "User" },
  { value: "team", label: "Team" },
  { value: "videoType", label: "Video Type" }
];

const dimensionFilterOptions = [
  { value: "none", label: "None" },
  { value: "top-10", label: "Top 10" },
  { value: "bottom-10", label: "Bottom 10" },
  { value: "custom", label: "Custom selection" }
];

const publishedOptions = [
  { value: "all", label: "All publish states" },
  ...publishedStatuses.map((status) => ({ value: status, label: status }))
];
