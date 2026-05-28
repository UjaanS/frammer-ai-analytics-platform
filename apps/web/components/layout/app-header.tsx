"use client";

import { Menu, Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { PersonaSwitcher } from "@/components/analytics/persona-switcher";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { sidebarNavigation } from "@/config/navigation";

type AppHeaderProps = {
  title?: string;
  actions?: ReactNode;
};

export function AppHeader({ title, actions }: AppHeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const currentItem = sidebarNavigation.find((item) => item.href.split("#")[0] === pathname);
  const resolvedTitle = title ?? currentItem?.title ?? "Dashboard";

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <header className="sticky top-0 z-30 flex h-[84px] items-center justify-between border-b border-slate-200 bg-white px-4 backdrop-blur supports-[backdrop-filter]:bg-white/95 dark:border-white/5 dark:bg-[#202438] dark:supports-[backdrop-filter]:bg-[#202438]/95 lg:px-9">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button aria-label="Open navigation" className="text-slate-500 lg:hidden dark:text-slate-300" size="icon" variant="ghost">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Primary product navigation</SheetDescription>
            <AppSidebar />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black tracking-normal text-[#f13f61] md:text-4xl">FRAMMER</span>
          <span className="rounded-full bg-lime-400 px-2 py-0.5 text-xs font-black text-slate-950">STAGE</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {/* useSearchParams inside PersonaSwitcher needs a Suspense boundary so
            the AppHeader doesn't bail every page out of static prerender. */}
        <Suspense fallback={null}>
          <PersonaSwitcher />
        </Suspense>
        <div className="hidden rounded-md bg-slate-100 px-4 py-2 text-right text-sm leading-tight text-slate-700 dark:bg-white/10 dark:text-slate-200 md:block">
          <div className="font-semibold text-slate-500 dark:text-slate-300">AAA - Frammer AI</div>
          <div className="font-bold text-slate-900 dark:text-white">Channel-Frammer AI</div>
        </div>
        <Button
          aria-label="Toggle theme"
          size="icon"
          variant="ghost"
          className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
