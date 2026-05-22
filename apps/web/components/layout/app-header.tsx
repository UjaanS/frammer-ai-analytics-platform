"use client";

import { Menu, SunMedium } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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
  const currentItem = sidebarNavigation.find((item) => item.href === pathname);
  const resolvedTitle = title ?? currentItem?.title ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-[84px] items-center justify-between border-b border-white/5 bg-[#202438] px-4 backdrop-blur supports-[backdrop-filter]:bg-[#202438]/95 lg:px-9">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button aria-label="Open navigation" className="text-slate-300 lg:hidden" size="icon" variant="ghost">
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
        <div className="hidden rounded-md bg-white/10 px-4 py-2 text-right text-sm leading-tight text-slate-200 md:block">
          <div className="font-semibold text-slate-300">AAA - Frammer AI</div>
          <div className="font-bold text-white">Channel-Frammer AI</div>
        </div>
        <Button aria-label="Theme" size="icon" variant="ghost" className="rounded-full bg-white/5 text-slate-200 hover:bg-white/10">
          <SunMedium className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
