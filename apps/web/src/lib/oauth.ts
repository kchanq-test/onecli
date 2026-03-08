import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export interface OAuthStatePayload {
  userId: string;
  nonce: string;
  scopes?: string[];
  [key: string]: unknown;
}

/**
 * Signs the OAuth state payload with an HMAC so the callback can verify
 * the state hasn't been tampered with (prevents IDOR via forged userId).
 */
export const signOAuthState = (payload: Record<string, unknown>): string => {
  const data = JSON.stringify(payload);
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) throw new Error("OAUTH_STATE_SECRET is not configured");

  const sig = createHmac("sha256", secret).update(data).digest("hex");
  return Buffer.from(JSON.stringify({ data: payload, sig })).toString(
    "base64url",
  );
};

/**
 * Verifies the HMAC signature on the OAuth state parameter to ensure it
 * was created by our server and hasn't been tampered with.
 */
export const verifyOAuthState = (raw: string): OAuthStatePayload | null => {
  try {
    const secret = process.env.OAUTH_STATE_SECRET;
    if (!secret) return null;

    const { data, sig } = JSON.parse(
      Buffer.from(raw, "base64url").toString(),
    ) as { data: OAuthStatePayload; sig: string };

    const expected = createHmac("sha256", secret)
      .update(JSON.stringify(data))
      .digest("hex");

    // Constant-time comparison to prevent timing attacks on the signature
    const sigBuf = Buffer.from(sig, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");

    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
};

/** Generates a random nonce for OAuth state. */
export const generateNonce = (): string => randomBytes(16).toString("hex");
