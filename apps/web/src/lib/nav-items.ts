import { LayoutDashboard, ScrollText, Plug, Settings } from "lucide-react";
import type { NavItem } from "@/app/(dashboard)/_components/nav-main";

export const navItems: NavItem[] = [
  { title: "Overview", url: "/overview", icon: LayoutDashboard },
  { title: "Services", url: "/services", icon: Plug },
  { title: "Audit Log", url: "/audit", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
];
