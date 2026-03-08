"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { getRecentAuditLogs, getAuditStats } from "@/lib/actions/audit";
import { getConnectedServices } from "@/lib/actions/services";
import { ApiKeyCard } from "./api-key-card";
import { StatsCards } from "./stats-cards";
import { RecentAuditTable } from "./recent-audit-table";

interface AuditLogEntry {
  id: string;
  action: string;
  service: string;
  status: string;
  source: string;
  createdAt: Date;
}

interface AuditStats {
  totalActions: number;
  recentActions: number;
  serviceCount: number;
}

export function OverviewContent() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [connectedCount, setConnectedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);
    Promise.all([
      getRecentAuditLogs(5, user.id),
      getAuditStats(user.id),
      getConnectedServices(user.id),
    ]).then(([logsData, statsData, services]) => {
      setLogs(logsData);
      setStats(statsData);
      setConnectedCount(
        services.filter((s) => s.status === "connected").length,
      );
      setLoading(false);
    });
  }, [user?.id]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">
          Your OneCLI dashboard at a glance.
        </p>
      </div>

      <ApiKeyCard />

      <StatsCards
        totalActions={stats?.totalActions ?? 0}
        recentActions={stats?.recentActions ?? 0}
        serviceCount={stats?.serviceCount ?? 0}
        connectedServices={connectedCount}
        loading={loading}
      />

      <RecentAuditTable logs={logs} />
    </div>
  );
}
