"use client";

import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type NlqInputProps = {
  onSubmit: (query: string) => Promise<{ summary: string }>;
};

const EXAMPLES = ["filter to LinkedIn", "compare May vs April"];

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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow focus-within:shadow-md dark:border-white/10 dark:bg-[#1f2336] dark:focus-within:shadow-black/40">
      <form
        className="flex items-center gap-3 px-4"
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
          placeholder="Ask anything about your analytics…"
          disabled={isLoading}
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] font-medium text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500"
          aria-label="Natural language dashboard query"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          aria-label="Submit query"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d3455d] text-white transition hover:bg-[#e14e68] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10 dark:disabled:text-slate-500"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </form>

      {/* Status / hint strip — subtle, low text weight */}
      <div className="border-t border-slate-100 px-4 py-2 text-[11px] dark:border-white/[0.05]">
        {status.kind === "success" ? (
          <p className="font-medium text-emerald-600 dark:text-emerald-300">{status.message}</p>
        ) : status.kind === "error" ? (
          <p className="font-medium text-rose-600 dark:text-rose-300">{status.message}</p>
        ) : (
          <p className="text-slate-400 dark:text-slate-500">
            Try{" "}
            {EXAMPLES.map((example, index) => (
              <span key={example}>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setQuery(example);
                    handleSubmit(example);
                  }}
                  className="font-medium text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline disabled:opacity-50 dark:text-slate-300 dark:hover:text-white"
                >
                  &ldquo;{example}&rdquo;
                </button>
                {index < EXAMPLES.length - 1 ? <span className="text-slate-300 dark:text-slate-600"> · </span> : null}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
