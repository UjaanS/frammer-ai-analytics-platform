import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

type DashboardShellProps = {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
};

export function DashboardShell({ children, title, actions }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 hidden w-[72px] lg:block">
        <AppSidebar />
      </div>
      <div className="lg:pl-[72px]">
        <AppHeader title={title} actions={actions} />
        <main className="mx-auto w-full max-w-[1840px] px-4 py-5 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
