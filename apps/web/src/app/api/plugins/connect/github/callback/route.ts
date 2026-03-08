import { NextRequest, NextResponse } from "next/server";
import { db } from "@onecli/db";
import { fetchGitHubUserInfo } from "@/lib/github";
import { verifyOAuthState } from "@/lib/oauth";

interface GitHubTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  token_type: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const code = request.nextUrl.searchParams.get("code");
    const stateParam = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${appUrl}/services?error=${encodeURIComponent(error)}`,
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(`${appUrl}/services?error=missing_params`);
    }

    const state = verifyOAuthState(stateParam);
    if (!state || !state.userId) {
      return NextResponse.redirect(`${appUrl}/services?error=invalid_state`);
    }

    // Exchange authorization code for tokens
    const redirectUri = `${appUrl}/api/plugins/connect/github/callback`;

    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          client_id: process.env.GITHUB_CLIENT_ID!,
          client_secret: process.env.GITHUB_CLIENT_SECRET!,
          code,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error(
        "[github-callback] Token exchange failed:",
        tokenRes.status,
        errBody,
      );
      return NextResponse.redirect(
        `${appUrl}/services?error=token_exchange_failed`,
      );
    }

    const tokens: GitHubTokenResponse = await tokenRes.json();

    // GitHub returns errors in the JSON body with 200 status
    if (tokens.error) {
      console.error(
        "[github-callback] Token exchange error:",
        tokens.error,
        tokens.error_description,
      );
      return NextResponse.redirect(
        `${appUrl}/services?error=token_exchange_failed`,
      );
    }

    // Parse granted scopes from the token response
    const grantedScopes = tokens.scope
      ? tokens.scope.split(/[, ]+/).filter(Boolean)
      : [];

    // GitHub Apps only return expires_in/refresh_token if
    // "Expire user authorization tokens" is enabled in app settings
    const tokenExpiry = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Fetch GitHub profile info
    const userInfo = await fetchGitHubUserInfo(tokens.access_token);
    const metadata = userInfo
      ? {
          login: userInfo.login,
          email: userInfo.email,
          name: userInfo.name,
          avatar_url: userInfo.avatar_url,
        }
      : undefined;

    // Account mismatch protection — reject if user picked a different GitHub account
    const existing = await db.connectedService.findUnique({
      where: {
        userId_provider: { userId: state.userId, provider: "github" },
      },
      select: { metadata: true },
    });

    if (existing?.metadata && userInfo) {
      const storedLogin = (existing.metadata as { login?: string }).login;
      if (storedLogin && storedLogin !== userInfo.login) {
        await db.auditLog.create({
          data: {
            userId: state.userId,
            action: "connected_service",
            service: "github",
            status: "denied",
            source: "app",
            metadata: {
              reason: "account_mismatch",
              expectedLogin: storedLogin,
              attemptedLogin: userInfo.login,
            },
          },
        });
        return NextResponse.redirect(
          `${appUrl}/services?error=account_mismatch`,
        );
      }
    }

    // Upsert connected service with tokens and metadata
    await db.connectedService.upsert({
      where: {
        userId_provider: { userId: state.userId, provider: "github" },
      },
      create: {
        userId: state.userId,
        provider: "github",
        status: "connected",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiry,
        scopes: grantedScopes,
        metadata: metadata ?? undefined,
      },
      update: {
        status: "connected",
        accessToken: tokens.access_token,
        scopes: grantedScopes,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        ...(tokenExpiry ? { tokenExpiry } : {}),
        ...(metadata ? { metadata } : {}),
      },
    });

    await db.auditLog.create({
      data: {
        userId: state.userId,
        action: "connected_service",
        service: "github",
        status: "success",
        source: "app",
        metadata: { login: userInfo?.login, email: userInfo?.email },
      },
    });

    return NextResponse.redirect(`${appUrl}/services?connected=github`);
  } catch (err) {
    console.error("[github-callback] Unhandled error:", err);
    return NextResponse.redirect(`${appUrl}/services?error=callback_failed`);
  }
}
