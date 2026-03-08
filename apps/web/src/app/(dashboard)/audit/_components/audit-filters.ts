export type DateRangeKey = "24h" | "7d" | "30d" | "all";

export interface AuditFilters {
  q?: string;
  services?: string[];
  statuses?: string[];
  sources?: string[];
  range?: DateRangeKey;
}

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

export const STATUS_OPTIONS = ["success", "denied", "error"] as const;

export const SOURCE_OPTIONS = ["app", "cli"] as const;
