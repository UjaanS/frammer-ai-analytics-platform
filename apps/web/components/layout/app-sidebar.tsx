// Decorative rail that mimics the parent Frammer platform sidebar.
// This is intentionally non-functional — navigation is handled by the
// parent app's real shell when this dashboard is embedded.

import {
  Bell,
  CalendarDays,
  Folder,
  Globe,
  LogOut,
  MessageSquare,
  Scissors,
  Settings,
  UserCircle,
  Video
} from "lucide-react";

const topIcons = [UserCircle, Bell, Folder, MessageSquare];
const bottomIcons = [Globe, Video, MessageSquare, Folder, CalendarDays, Settings, Scissors];

export function AppSidebar() {
  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-white/5 dark:bg-[#202438]">
      <nav className="flex flex-1 flex-col items-center gap-4 py-5">
        {/* The first icon mimics the active state from the parent platform */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ef405b] text-white shadow-lg shadow-[#ef405b]/25">
          <UserCircle className="h-5 w-5" />
        </div>
        {topIcons.slice(1).map((Icon, index) => (
          <div
            key={`top-${index}`}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 dark:text-slate-500"
          >
            <Icon className="h-5 w-5" />
          </div>
        ))}
        <div className="my-2 h-px w-8 bg-slate-200 dark:bg-white/10" />
        {bottomIcons.map((Icon, index) => (
          <div
            key={`bottom-${index}`}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 dark:text-slate-500"
          >
            <Icon className="h-5 w-5" />
          </div>
        ))}
      </nav>
      <div className="flex justify-center border-t border-slate-200 py-5 dark:border-white/5">
        <LogOut className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      </div>
    </aside>
  );
}
