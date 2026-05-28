"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { type Persona, personaLabels } from "@/lib/widgets/dashboard-presets";
import { cn } from "@/lib/utils";

const PERSONAS: Persona[] = ["client", "admin", "tech"];

export function readPersonaFromSearchParams(searchParams: { get(name: string): string | null }): Persona {
  const raw = searchParams.get("view");
  if (raw === "client" || raw === "admin" || raw === "tech") return raw;
  return "client";
}

export function PersonaSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = readPersonaFromSearchParams(searchParams);

  const setPersona = useCallback(
    (persona: Persona) => {
      if (persona === active) return;
      const next = new URLSearchParams(searchParams.toString());
      if (persona === "client") {
        next.delete("view");
      } else {
        next.set("view", persona);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [active, pathname, router, searchParams]
  );

  return (
    <div
      role="group"
      aria-label="Dashboard view persona"
      className="hidden rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold sm:inline-flex dark:border-white/10 dark:bg-white/[0.04]"
    >
      {PERSONAS.map((persona) => {
        const isActive = persona === active;
        return (
          <button
            key={persona}
            type="button"
            onClick={() => setPersona(persona)}
            className={cn(
              "rounded-full px-3 py-1.5 transition",
              isActive
                ? "bg-[#ef405b] text-white shadow shadow-[#ef405b]/25"
                : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10"
            )}
          >
            {personaLabels[persona]}
          </button>
        );
      })}
    </div>
  );
}
