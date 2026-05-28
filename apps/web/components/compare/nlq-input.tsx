"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type NlqInputProps = {
  onSubmit: (query: string) => Promise<{ summary: string }>;
};

const EXAMPLE_QUERIES = [
  "show only LinkedIn channel",
  "compare May vs April for published videos",
  "add a bar chart of downloads by user",
  "switch to admin view",
  "reset everything"
];

export function NlqInput({ onSubmit }: NlqInputProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(currentQuery: string) {
    const trimmed = currentQuery.trim();
    if (!trimmed || status.kind === "loading") return;

    setStatus({ kind: "loading" });
    try {
      const { summary } = await onSubmit(trimmed);
      setStatus({ kind: "success", message: summary });
      setQuery("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      setStatus({ kind: "error", message });
    }
  }

  const isLoading = status.kind === "loading";

  return (
    <div className="rounded-lg border border-slate-200 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.025]">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(query);
        }}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[#ef405b]" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask anything: filters, widgets, compare modes…"
          disabled={isLoading}
          className="h-9 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-50 dark:text-slate-100 dark:placeholder:text-slate-500"
          aria-label="Natural language dashboard query"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#d3455d] px-4 text-xs font-bold text-white transition hover:bg-[#e14e68] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking
            </>
          ) : (
            "Ask AI"
          )}
        </button>
      </form>

      {/* Status row */}
      {status.kind === "success" ? (
        <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{status.message}</p>
      ) : status.kind === "error" ? (
        <p className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">{status.message}</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">Try</span>
          {EXAMPLE_QUERIES.slice(0, 3).map((example) => (
            <button
              key={example}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setQuery(example);
                handleSubmit(example);
              }}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
