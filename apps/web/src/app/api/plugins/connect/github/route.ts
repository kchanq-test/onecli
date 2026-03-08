import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { db } from "@onecli/db";
import { signOAuthState, generateNonce } from "@/lib/oauth";
import { GITHUB_REQUESTED_SCOPES, validateGitHubScopeIds } from "@/lib/github";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

  // Read and validate scopes from query params, fall back to all scopes
  const scopesParam = request.nextUrl.searchParams.get("scopes");
  let scopeIds: string[];

  if (scopesParam) {
    scopeIds = scopesParam.split(",").filter(Boolean);
    const unknown = validateGitHubScopeIds(scopeIds);
    if (unknown.length > 0) {
      return NextResponse.redirect(
        new URL("/services/connect/github?error=invalid_scopes", appUrl),
      );
    }
  } else {
    scopeIds = GITHUB_REQUESTED_SCOPES;
  }

  // Look up existing connection for login hint
  const existingService = await db.connectedService.findUnique({
    where: { userId_provider: { userId: user.id, provider: "github" } },
    select: { metadata: true },
  });
  const existingLogin = (existingService?.metadata as { login?: string } | null)
    ?.login;

  const nonce = generateNonce();
  const state = signOAuthState({ userId: user.id, nonce });

  const redirectUri = `${appUrl}/api/plugins/connect/github/callback`;

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopeIds.join(" "));
  authUrl.searchParams.set("state", state);
  if (existingLogin) {
    authUrl.searchParams.set("login", existingLogin);
  }

  return NextResponse.redirect(authUrl.toString());
}
