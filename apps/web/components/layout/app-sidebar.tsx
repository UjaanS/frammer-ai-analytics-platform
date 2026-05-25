"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sidebarNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col border-r border-white/5 bg-[#202438]">
      <div className="flex h-20 items-center justify-center border-b border-white/5">
        <Button aria-label="Open navigation" size="icon" variant="ghost" className="text-slate-300 hover:bg-white/5 hover:text-white">
          <Menu className="h-6 w-6" />
        </Button>
      </div>
      <nav className="flex flex-1 flex-col items-center gap-4 py-5">
        {sidebarNavigation.map((item) => {
          // Strip hash anchor so we can compare against pathname cleanly
          const itemPath = item.href.split("#")[0];
          const isActive = pathname === itemPath;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/5 hover:text-white",
                isActive && "bg-[#ef405b] text-white shadow-lg shadow-[#ef405b]/25"
              )}
              title={item.title}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
      <div className="flex justify-center border-t border-white/5 py-5">
        <LogOut className="h-5 w-5 text-slate-400" />
      </div>
    </aside>
  );
}
