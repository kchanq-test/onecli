import { NextRequest, NextResponse } from "next/server";
import { db } from "@onecli/db";
import {
  fetchGoogleUserInfo,
  scopeUrlsToIds,
  GOOGLE_DEFAULT_SCOPE_IDS,
} from "@/lib/google";
import { verifyOAuthState } from "@/lib/oauth";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
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

    // Verify the HMAC signature on the state to prevent forged userId
    const state = verifyOAuthState(stateParam);
    if (!state || !state.userId) {
      return NextResponse.redirect(`${appUrl}/services?error=invalid_state`);
    }

    // Exchange authorization code for tokens
    const redirectUri = `${appUrl}/api/plugins/connect/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error(
        "[google-callback] Token exchange failed:",
        tokenRes.status,
        errBody,
      );
      return NextResponse.redirect(
        `${appUrl}/services?error=token_exchange_failed`,
      );
    }

    const tokens: GoogleTokenResponse = await tokenRes.json();

    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    // Fetch Google profile info
    const userInfo = await fetchGoogleUserInfo(tokens.access_token);
    const metadata = userInfo
      ? {
          email: userInfo.email,
          picture: userInfo.picture,
          name: userInfo.name,
        }
      : undefined;

    // Derive actually-granted scopes from the token response (not from state)
    const grantedUrls = tokens.scope?.split(" ") ?? [];
    const grantedIds = scopeUrlsToIds(grantedUrls);

    // Merge with existing approved scopes + default scopes
    const existing = await db.connectedService.findUnique({
      where: {
        userId_provider: { userId: state.userId, provider: "google" },
      },
      select: { scopes: true, metadata: true },
    });

    // Reject if the user picked a different Google account during incremental auth
    if (existing?.metadata && userInfo) {
      const storedEmail = (existing.metadata as { email?: string }).email;
      if (storedEmail && storedEmail !== userInfo.email) {
        await db.auditLog.create({
          data: {
            userId: state.userId,
            action: "connected_service",
            service: "google",
            status: "denied",
            source: "app",
            metadata: {
              reason: "account_mismatch",
              expectedEmail: storedEmail,
              attemptedEmail: userInfo.email,
            },
          },
        });
        return NextResponse.redirect(
          `${appUrl}/services?error=account_mismatch`,
        );
      }
    }
    const mergedScopes = [
      ...new Set([
        ...GOOGLE_DEFAULT_SCOPE_IDS,
        ...(existing?.scopes ?? []),
        ...grantedIds,
      ]),
    ];

    // Upsert connected service with tokens, scopes, and metadata
    await db.connectedService.upsert({
      where: {
        userId_provider: { userId: state.userId, provider: "google" },
      },
      create: {
        userId: state.userId,
        provider: "google",
        status: "connected",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiry,
        scopes: mergedScopes,
        metadata: metadata ?? undefined,
      },
      update: {
        status: "connected",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        tokenExpiry,
        scopes: mergedScopes,
        ...(metadata ? { metadata } : {}),
      },
    });

    await db.auditLog.create({
      data: {
        userId: state.userId,
        action: "connected_service",
        service: "google",
        status: "success",
        source: "app",
        metadata: { scopes: grantedIds, email: userInfo?.email },
      },
    });

    return NextResponse.redirect(`${appUrl}/services?connected=google`);
  } catch (err) {
    console.error("[google-callback] Unhandled error:", err);
    return NextResponse.redirect(`${appUrl}/services?error=callback_failed`);
  }
}
