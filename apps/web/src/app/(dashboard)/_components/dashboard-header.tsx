"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Check, Copy, Moon, Sun, Terminal } from "lucide-react";
import { SidebarTrigger } from "@onecli/ui/components/sidebar";
import { Separator } from "@onecli/ui/components/separator";
import { Button } from "@onecli/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@onecli/ui/components/dialog";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@onecli/ui/components/breadcrumb";
import { navItems } from "@/lib/nav-items";

const INSTALL_COMMAND = "curl -fsSL https://onecli.sh/install | sh";

export const DashboardHeader = () => {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const navItem = navItems.find((item) => pathname.startsWith(item.url));
  const title = navItem?.title ?? "Dashboard";

  const handleCopy = () => {
    navigator.clipboard.writeText(INSTALL_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Detect sub-pages (e.g. /services/connect/google → ["connect", "google"])
  const subPath = navItem
    ? pathname.slice(navItem.url.length).replace(/^\//, "")
    : "";
  const subSegments = subPath ? subPath.split("/") : [];

  // Build a readable sub-page label from the last segment
  const lastSegment = subSegments[subSegments.length - 1];
  const subPageLabel = lastSegment
    ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
    : null;

  return (
    <div className="flex w-full items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {subPageLabel ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={navItem!.url}>{title}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{subPageLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        {typeof window !== "undefined" &&
          window.location.hostname !== "app.onecli.sh" && (
            <span className="rounded-md bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
              DEV
            </span>
          )}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="brand" size="sm" className="h-7">
              <Terminal className="size-3.5" />
              Install
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Install OneCLI</DialogTitle>
              <DialogDescription>
                Run this command in your terminal to install the{" "}
                <code className="text-foreground font-semibold">oc</code>{" "}
                command.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-4 font-mono text-sm">
              <Terminal className="size-4 shrink-0 text-muted-foreground" />
              <code className="flex-1 select-all">{INSTALL_COMMAND}</code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 cursor-pointer rounded-md p-1.5 transition-colors hover:bg-muted"
              >
                {copied ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              Then run{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                oc auth login
              </code>{" "}
              to connect your account.
            </p>
          </DialogContent>
        </Dialog>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </div>
  );
};
