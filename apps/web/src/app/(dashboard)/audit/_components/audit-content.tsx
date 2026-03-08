"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { getAuditLogs, getDistinctServices } from "@/lib/actions/audit";
import { AuditLogTable } from "./audit-log-table";
import { AuditFilterBar } from "./audit-filter-bar";
import type { AuditFilters, DateRangeKey } from "./audit-filters";

type AuditData = Awaited<ReturnType<typeof getAuditLogs>>;

const emptyData: AuditData = {
  logs: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

const VALID_RANGES = new Set<DateRangeKey>(["24h", "7d", "30d", "all"]);

const parseFilters = (params: URLSearchParams): AuditFilters => {
  const q = params.get("q") || undefined;
  const services = params.get("service")?.split(",").filter(Boolean) ?? [];
  const statuses = params.get("status")?.split(",").filter(Boolean) ?? [];
  const sources = params.get("source")?.split(",").filter(Boolean) ?? [];
  const rawRange = params.get("range") ?? "7d";
  const range = VALID_RANGES.has(rawRange as DateRangeKey)
    ? (rawRange as DateRangeKey)
    : "7d";

  return {
    q,
    services: services.length ? services : undefined,
    statuses: statuses.length ? statuses : undefined,
    sources: sources.length ? sources : undefined,
    range,
  };
};

const DEFAULT_RANGE: DateRangeKey = "7d";

const hasActiveFilters = (filters: AuditFilters) =>
  !!filters.q ||
  !!filters.services?.length ||
  !!filters.statuses?.length ||
  !!filters.sources?.length ||
  (!!filters.range && filters.range !== DEFAULT_RANGE);

export const AuditContent = () => {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const initialFilters = useMemo(
    () => parseFilters(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
    [],
  );

  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const [data, setData] = useState<AuditData>(emptyData);
  const [services, setServices] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Sync filters from URL only on browser back/forward (popstate) to avoid the
  // double-fetch that previously happened when both state and URL drove updates.
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setFilters(parseFilters(params));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Fetch distinct services once on mount
  useEffect(() => {
    if (!user?.id) return;
    getDistinctServices(user.id)
      .then(setServices)
      .catch(() => {});
  }, [user?.id]);

  // Fetch audit logs when page or filters change.
  // Wrapped in startTransition so the UI stays responsive — React will
  // automatically interrupt stale transitions when filters change again.
  useEffect(() => {
    if (!user?.id) return;

    let stale = false;

    startTransition(async () => {
      try {
        const result = await getAuditLogs(page, user.id, filters);
        if (!stale) setData(result);
      } catch {
        if (!stale) setData(emptyData);
      }
    });

    return () => {
      stale = true;
    };
  }, [user?.id, page, filters]);

  const handleFiltersChange = useCallback((next: AuditFilters) => {
    setFilters(next);
  }, []);

  return (
    <>
      <AuditFilterBar
        services={services}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <AuditLogTable
        logs={data.logs}
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        hasActiveFilters={hasActiveFilters(filters)}
        loading={isPending}
      />
    </>
  );
};
