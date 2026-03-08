// --- Scope Registry ---

export interface GitHubScope {
  id: string;
  label: string;
  description: string;
}

export const GITHUB_SCOPES: GitHubScope[] = [
  {
    id: "repo",
    label: "Full control of private and public repositories",
    description: "Access commits, statuses, code, PRs, issues",
  },
];

/** Scopes requested during the OAuth authorize flow. */
export const GITHUB_REQUESTED_SCOPES = GITHUB_SCOPES.map((s) => s.id);

const scopeMap = new Map(GITHUB_SCOPES.map((s) => [s.id, s]));

/** Look up a scope definition by its ID. */
export function getGitHubScope(id: string): GitHubScope | undefined {
  return scopeMap.get(id);
}

/** Validates that all scope IDs are known. Returns unknown IDs. */
export function validateGitHubScopeIds(ids: string[]): string[] {
  return ids.filter((id) => !scopeMap.has(id));
}

// --- Organization types ---

export interface GitHubOrganization {
  login: string;
  id: number;
  avatar_url: string;
  description: string | null;
}

/**
 * Fetches organizations the authenticated user belongs to.
 */
export async function fetchGitHubUserOrgs(
  accessToken: string,
): Promise<GitHubOrganization[]> {
  const res = await fetch("https://api.github.com/user/orgs?per_page=100", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) return [];

  return (await res.json()) as GitHubOrganization[];
}

interface GitHubTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  token_type: string;
}

/**
 * Exchanges a refresh token for a new GitHub access + refresh token.
 * GitHub App refresh tokens are single-use — the caller must store the
 * new refresh_token returned here.
 */
export async function refreshGitHubToken(
  refreshToken: string,
): Promise<GitHubTokenResponse> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub token refresh failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // GitHub returns errors in the JSON body with 200 status
  if (data.error) {
    throw new Error(
      `GitHub token refresh error: ${data.error} — ${data.error_description}`,
    );
  }

  return data;
}

/**
 * Returns true if the error indicates GitHub has revoked or invalidated the token.
 */
export function isGitHubTokenError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("bad_refresh_token") ||
    msg.includes("incorrect") ||
    msg.includes("revoked") ||
    msg.includes("expired")
  );
}

interface GitHubUserInfo {
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

/**
 * Fetches GitHub user profile info (login, name, avatar) and primary email.
 */
export async function fetchGitHubUserInfo(
  accessToken: string,
): Promise<GitHubUserInfo | null> {
  const [userRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }),
    fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }),
  ]);

  if (!userRes.ok) return null;

  const user = (await userRes.json()) as {
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
  };

  // Try to get primary verified email from the emails endpoint
  let email = user.email;
  if (emailsRes.ok) {
    const emails = (await emailsRes.json()) as {
      email: string;
      primary: boolean;
      verified: boolean;
    }[];
    const primary = emails.find((e) => e.primary && e.verified);
    if (primary) email = primary.email;
  }

  return {
    login: user.login,
    name: user.name,
    email,
    avatar_url: user.avatar_url,
  };
}
