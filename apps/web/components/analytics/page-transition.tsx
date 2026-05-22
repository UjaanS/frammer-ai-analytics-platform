import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">{children}</div>;
}
