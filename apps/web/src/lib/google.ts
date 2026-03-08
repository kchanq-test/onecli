interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Exchanges a refresh token for a new Google access token.
 */
export async function refreshGoogleToken(
  refreshToken: string,
  scopeUrls?: string[],
): Promise<GoogleTokenResponse> {
  const params: Record<string, string> = {
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  };
  if (scopeUrls?.length) {
    params.scope = scopeUrls.join(" ");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Returns true if the error indicates Google has revoked or invalidated the token.
 * Google returns `invalid_grant` when a refresh token is revoked/expired,
 * and `invalid_token` when a revoke call targets an already-revoked token.
 */
export function isTokenRevokedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("invalid_grant") || msg.includes("invalid_token");
}

// --- Default Scopes (always requested) ---

export const GOOGLE_DEFAULT_SCOPE_URLS = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const GOOGLE_DEFAULT_SCOPE_IDS = ["userinfo.profile", "userinfo.email"];

export async function fetchGoogleUserInfo(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    email: string;
    picture: string;
    name: string;
  }>;
}

// --- Scope Registry ---

export interface GoogleScope {
  id: string;
  scope: string;
  label: string;
  description: string;
  service: string;
}

export const GOOGLE_SCOPES: GoogleScope[] = [
  {
    id: "gmail.readonly",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    label: "Read emails",
    description: "View your email messages and settings",
    service: "Gmail",
  },
  {
    id: "gmail.modify",
    scope: "https://www.googleapis.com/auth/gmail.modify",
    label: "Read and modify emails",
    description:
      "Read, compose, send, and manage your email (label, trash, archive) — excludes permanent deletion",
    service: "Gmail",
  },
  {
    id: "gmail.send",
    scope: "https://www.googleapis.com/auth/gmail.send",
    label: "Send emails",
    description: "Send email on your behalf",
    service: "Gmail",
  },
  {
    id: "calendar.readonly",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    label: "Read calendar events",
    description: "View your calendar events and settings",
    service: "Google Calendar",
  },
  {
    id: "calendar.events",
    scope: "https://www.googleapis.com/auth/calendar.events",
    label: "Create and edit events",
    description: "Create, modify, and delete calendar events",
    service: "Google Calendar",
  },
  {
    id: "drive.readonly",
    scope: "https://www.googleapis.com/auth/drive.readonly",
    label: "Read files",
    description: "View files and folders in your Google Drive",
    service: "Google Drive",
  },
  {
    id: "drive.file",
    scope: "https://www.googleapis.com/auth/drive.file",
    label: "Create and edit files",
    description: "Create, modify, and delete files in Google Drive",
    service: "Google Drive",
  },
  {
    id: "spreadsheets.readonly",
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    label: "Read spreadsheets",
    description: "View your Google Sheets and data",
    service: "Google Sheets",
  },
  {
    id: "spreadsheets",
    scope: "https://www.googleapis.com/auth/spreadsheets",
    label: "Create and edit spreadsheets",
    description: "Create, modify, and delete spreadsheets and data",
    service: "Google Sheets",
  },
];

export interface GoogleService {
  name: string;
  icon: string;
  scopeIds: string[];
}

export const GOOGLE_SERVICES: GoogleService[] = [
  {
    name: "Gmail",
    icon: "mail",
    scopeIds: ["gmail.readonly", "gmail.modify", "gmail.send"],
  },
  {
    name: "Google Calendar",
    icon: "calendar",
    scopeIds: ["calendar.readonly", "calendar.events"],
  },
  {
    name: "Google Drive",
    icon: "hard-drive",
    scopeIds: ["drive.readonly", "drive.file"],
  },
  {
    name: "Google Sheets",
    icon: "sheet",
    scopeIds: ["spreadsheets.readonly", "spreadsheets"],
  },
];

const scopeMap = new Map(GOOGLE_SCOPES.map((s) => [s.id, s.scope]));
const reverseScopeMap = new Map(GOOGLE_SCOPES.map((s) => [s.scope, s.id]));

/** Converts short scope IDs to full Google OAuth URLs. */
export function scopeIdsToUrls(ids: string[]): string[] {
  return ids.map((id) => {
    const url = scopeMap.get(id);
    if (!url) throw new Error(`Unknown scope ID: ${id}`);
    return url;
  });
}

/** Validates that all scope IDs are known. Returns unknown IDs. */
export function validateScopeIds(ids: string[]): string[] {
  return ids.filter((id) => !scopeMap.has(id));
}

/** Converts full Google OAuth scope URLs back to short IDs. Ignores unknown URLs. */
export function scopeUrlsToIds(urls: string[]): string[] {
  return urls
    .map((url) => reverseScopeMap.get(url))
    .filter((id): id is string => id != null);
}
