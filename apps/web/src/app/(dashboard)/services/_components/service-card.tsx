"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@onecli/ui/components/card";
import { Badge } from "@onecli/ui/components/badge";
import { Button } from "@onecli/ui/components/button";
import { cn } from "@onecli/ui/lib/utils";

type ServiceStatus = "connected" | "revoked" | undefined;

interface ServiceCardProps {
  provider: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status?: ServiceStatus;
  scopeCount?: number;
  comingSoon?: boolean;
}

export function ServiceCard({
  provider,
  name,
  description,
  icon: Icon,
  status,
  scopeCount = 0,
  comingSoon = false,
}: ServiceCardProps) {
  const [currentStatus, setCurrentStatus] = useState<ServiceStatus>(status);

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  const isConnected = currentStatus === "connected";
  const isRevoked = currentStatus === "revoked";

  return (
    <Card
      className={cn(
        "relative overflow-hidden flex flex-col",
        comingSoon && "opacity-60",
        isConnected && "border-emerald-500/30",
        isRevoked && "border-amber-500/30",
      )}
    >
      {isConnected && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
      )}
      {isRevoked && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
              <Icon className="size-5" />
            </div>
            <CardTitle className="text-base">{name}</CardTitle>
          </div>
          {isConnected ? (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Connected
              </span>
            </div>
          ) : isRevoked ? (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Connection lost
              </span>
            </div>
          ) : comingSoon ? (
            <Badge variant="secondary" className="text-xs">
              Coming Soon
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <CardDescription>{description}</CardDescription>
        {!comingSoon && (
          <div className="mt-auto pt-4 flex flex-col gap-2">
            {isConnected && scopeCount > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400/70">
                {scopeCount} {scopeCount === 1 ? "permission" : "permissions"}{" "}
                granted
              </p>
            )}
            {isRevoked && scopeCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400/70">
                {scopeCount} {scopeCount === 1 ? "permission" : "permissions"}{" "}
                to restore
              </p>
            )}
            <Button
              size="sm"
              variant={isConnected ? "outline" : "default"}
              className="w-full"
              asChild
            >
              <Link href={`/services/connect/${provider}`}>
                {isConnected ? "Manage" : isRevoked ? "Reconnect" : "Connect"}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
