const RESEND_API_BASE = "https://api.resend.com";

export interface ResendDomain {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

/**
 * Validates a Resend API key by calling GET /api-keys.
 *
 * Resend returns different responses based on key validity:
 * - 200: valid key with full access
 * - 401 "restricted_api_key": valid key with sending-only permissions
 * - 400 "validation_error": invalid/malformed key
 */
export async function validateResendApiKey(apiKey: string): Promise<boolean> {
  try {
    const key = apiKey.trim();
    const res = await fetch(`${RESEND_API_BASE}/api-keys`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    // 200 = full access key
    if (res.ok) return true;

    // 401 with "restricted_api_key" = valid key, just limited permissions
    if (res.status === 401) {
      const body = (await res.json().catch(() => null)) as {
        name?: string;
      } | null;
      if (body?.name === "restricted_api_key") return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Fetches the list of domains associated with a Resend API key.
 */
export async function fetchResendDomains(
  apiKey: string,
): Promise<ResendDomain[]> {
  const res = await fetch(`${RESEND_API_BASE}/domains`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { data: ResendDomain[] };
  return data.data ?? [];
}
