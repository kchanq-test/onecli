"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@onecli/ui/components/sidebar";
import { cn } from "@onecli/ui/lib/utils";

const sidebarMenuButtonActiveStyles =
  "font-normal data-[active=true]:bg-brand/10 data-[active=true]:font-medium data-[active=true]:text-brand data-[active=true]:hover:bg-brand/15 dark:data-[active=true]:bg-brand/10 dark:data-[active=true]:text-brand dark:data-[active=true]:hover:bg-brand/15";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface NavMainProps {
  items: NavItem[];
}

export const NavMain = ({ items }: NavMainProps) => {
  const pathname = usePathname();

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname.startsWith(url);
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              asChild
              isActive={isActive(item.url)}
              tooltip={item.title}
              className={cn(sidebarMenuButtonActiveStyles)}
            >
              <Link href={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
};
