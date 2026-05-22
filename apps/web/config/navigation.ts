import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  DatabaseZap,
  FileVideo,
  Filter,
  LayoutDashboard,
  LineChart,
  Share2,
  Users
} from "lucide-react";

export type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const sidebarNavigation: NavigationItem[] = [
  {
    title: "Executive Summary",
    href: "/executive-summary",
    icon: LayoutDashboard
  },
  {
    title: "Usage & Trends",
    href: "/usage-trends",
    icon: LineChart
  },
  {
    title: "Channel / User",
    href: "/channel-user-analytics",
    icon: Users
  },
  {
    title: "Content Analytics",
    href: "/content-analytics",
    icon: BarChart3
  },
  {
    title: "Publishing Funnel",
    href: "/publishing-funnel",
    icon: Filter
  },
  {
    title: "Data Quality",
    href: "/data-quality",
    icon: DatabaseZap
  },
  {
    title: "Video Explorer",
    href: "/video-explorer",
    icon: FileVideo
  },
  {
    title: "Multi-Dimension",
    href: "/executive-summary#multi-dimension",
    icon: Share2
  }
];
