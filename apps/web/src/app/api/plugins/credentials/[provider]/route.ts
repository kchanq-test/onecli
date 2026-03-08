import { NextRequest, NextResponse } from "next/server";
import { db } from "@onecli/db";
import {
  refreshGoogleToken,
  isTokenRevokedError,
  validateScopeIds,
  scopeIdsToUrls,
  GOOGLE_DEFAULT_SCOPE_URLS,
} from "@/lib/google";
import { refreshGitHubToken, isGitHubTokenError } from "@/lib/github";
import { validateResendApiKey } from "@/lib/resend";

const TOKEN_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

const SUPPORTED_PROVIDERS = new Set(["google", "github", "resend"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing x-api-key header" },
        { status: 401 },
      );
    }

    const user = await db.user.findUnique({
      where: { apiKey },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { provider } = await params;

    if (!SUPPORTED_PROVIDERS.has(provider)) {
      return NextResponse.json(
        { error: "Unsupported provider" },
        { status: 400 },
      );
    }

    const service = await db.connectedService.findUnique({
      where: {
        userId_provider: { userId: user.id, provider },
      },
    });

    if (
      !service ||
      (!service.refreshToken && !service.accessToken) ||
      service.status === "disconnected"
    ) {
      return NextResponse.json(
        { error: "service_not_connected" },
        { status: 404 },
      );
    }

    if (service.status === "revoked") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      return NextResponse.json(
        {
          error: "service_revoked",
          action: `${appUrl}/services/connect/${provider}`,
        },
        { status: 401 },
      );
    }

    // Scope validation (Google only — GitHub permissions are App-level)
    if (provider === "google") {
      const scopeParam = request.nextUrl.searchParams.get("scope");
      if (scopeParam) {
        const requestedScopes = scopeParam.split(",").filter(Boolean);

        const unknown = validateScopeIds(requestedScopes);
        if (unknown.length > 0) {
          return NextResponse.json(
            { error: "invalid_scopes", invalid: unknown },
            { status: 400 },
          );
        }

        const approvedSet = new Set(service.scopes);
        const missing = requestedScopes.filter((s) => !approvedSet.has(s));
        if (missing.length > 0) {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          return NextResponse.json(
            {
              error: "missing_scopes",
              missing,
              action: `${appUrl}/services/connect/${provider}`,
            },
            { status: 403 },
          );
        }
      }
    }

    // Resend: API keys don't expire — validate and return directly
    if (provider === "resend") {
      if (!service.accessToken) {
        return NextResponse.json(
          { error: "service_not_connected" },
          { status: 404 },
        );
      }

      const valid = await validateResendApiKey(service.accessToken);
      if (!valid) {
        return await markRevoked(service.id, user.id, provider);
      }

      return NextResponse.json({
        access_token: service.accessToken,
        token_type: "Bearer",
        scopes: service.scopes,
      });
    }

    // Non-expiring token (e.g. GitHub OAuth App without token expiration enabled):
    // has access token but no refresh token and no expiry — return directly
    if (service.accessToken && !service.refreshToken && !service.tokenExpiry) {
      return NextResponse.json({
        access_token: service.accessToken,
        token_type: "Bearer",
        scopes: service.scopes,
      });
    }

    // Check if access token is still valid (with 5-min buffer)
    const needsRefresh =
      !service.accessToken ||
      !service.tokenExpiry ||
      service.tokenExpiry.getTime() - Date.now() < TOKEN_BUFFER_MS;

    if (needsRefresh) {
      if (provider === "google") {
        return await refreshGoogleCredentials(service, user.id);
      }
      if (provider === "github") {
        return await refreshGitHubCredentials(service, user.id);
      }
    }

    return NextResponse.json({
      access_token: service.accessToken,
      token_type: "Bearer",
      expires_at: service.tokenExpiry!.toISOString(),
      scopes: service.scopes,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function refreshGoogleCredentials(service: any, userId: string) {
  const provider = "google";
  const scopeUrls = [
    ...GOOGLE_DEFAULT_SCOPE_URLS,
    ...scopeIdsToUrls(
      service.scopes.filter((id: string) => !id.startsWith("userinfo.")),
    ),
  ];

  let tokens;
  try {
    tokens = await refreshGoogleToken(service.refreshToken, scopeUrls);
  } catch (err) {
    if (isTokenRevokedError(err)) {
      return await markRevoked(service.id, userId, provider);
    }
    throw err;
  }

  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

  await db.connectedService.update({
    where: { id: service.id },
    data: {
      accessToken: tokens.access_token,
      tokenExpiry,
    },
  });

  return NextResponse.json({
    access_token: tokens.access_token,
    token_type: tokens.token_type,
    expires_at: tokenExpiry.toISOString(),
    scopes: service.scopes,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function refreshGitHubCredentials(service: any, userId: string) {
  const provider = "github";

  let tokens;
  try {
    tokens = await refreshGitHubToken(service.refreshToken);
  } catch (err) {
    if (isGitHubTokenError(err)) {
      return await markRevoked(service.id, userId, provider);
    }
    throw err;
  }

  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

  // GitHub refresh tokens are single-use — store the new one
  await db.connectedService.update({
    where: { id: service.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry,
    },
  });

  return NextResponse.json({
    access_token: tokens.access_token,
    token_type: tokens.token_type,
    expires_at: tokenExpiry.toISOString(),
  });
}

async function markRevoked(
  serviceId: string,
  userId: string,
  provider: string,
) {
  await db.connectedService.update({
    where: { id: serviceId },
    data: {
      status: "revoked",
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
    },
  });

  await db.auditLog.create({
    data: {
      userId,
      action: "disconnected_service",
      service: provider,
      status: "success",
      source: "app",
      metadata: { reason: "token_revoked" },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json(
    {
      error: "service_revoked",
      action: `${appUrl}/services/connect/${provider}`,
    },
    { status: 401 },
  );
}
