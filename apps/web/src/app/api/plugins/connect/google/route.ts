import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { db } from "@onecli/db";
import {
  scopeIdsToUrls,
  validateScopeIds,
  GOOGLE_DEFAULT_SCOPE_URLS,
} from "@/lib/google";
import { signOAuthState, generateNonce } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Always require an authenticated server session — never accept userId
  // from query params, as that would allow any unauthenticated user to
  // initiate an OAuth flow for someone else's account.
  const session = await getServerSession();
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", appUrl));
  }

  const user = await db.user.findUnique({
    where: { cognitoId: session.id },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", appUrl));
  }

  // Read and validate scopes from query params
  const scopesParam = request.nextUrl.searchParams.get("scopes");
  if (!scopesParam) {
    return NextResponse.redirect(new URL("/services/connect/google", appUrl));
  }

  const scopeIds = scopesParam.split(",").filter(Boolean);
  const unknown = validateScopeIds(scopeIds);
  if (unknown.length > 0) {
    return NextResponse.redirect(
      new URL(`/services/connect/google?error=invalid_scopes`, appUrl),
    );
  }

  const scopeUrls = [...GOOGLE_DEFAULT_SCOPE_URLS, ...scopeIdsToUrls(scopeIds)];

  // Look up existing connection to get login_hint for account pinning
  const existingService = await db.connectedService.findUnique({
    where: { userId_provider: { userId: user.id, provider: "google" } },
    select: { metadata: true },
  });
  const existingEmail = (existingService?.metadata as { email?: string } | null)
    ?.email;

  const nonce = generateNonce();
  const state = signOAuthState({ userId: user.id, nonce, scopes: scopeIds });

  const redirectUri = `${appUrl}/api/plugins/connect/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopeUrls.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("include_granted_scopes", "true");
  if (existingEmail) {
    authUrl.searchParams.set("login_hint", existingEmail);
  }

  return NextResponse.redirect(authUrl.toString());
}
