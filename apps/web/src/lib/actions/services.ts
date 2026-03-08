"use server";

import { db, Prisma } from "@onecli/db";
import { getServerSession } from "@/lib/auth/server";
import { fetchGitHubUserOrgs } from "@/lib/github";
import {
  validateResendApiKey,
  fetchResendDomains,
  type ResendDomain,
} from "@/lib/resend";

export async function getConnectedServices(authId?: string) {
  if (!authId) {
    const session = await getServerSession();
    if (!session) return [];
    authId = session.id;
  }

  const user = await db.user.findUnique({
    where: { cognitoId: authId },
    select: { id: true },
  });

  if (!user) return [];

  return db.connectedService.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      provider: true,
      status: true,
      scopes: true,
      metadata: true,
      connectedAt: true,
    },
    orderBy: { connectedAt: "desc" },
  });
}

export interface ServiceInfo {
  scopes: string[];
  metadata: Record<string, unknown> | null;
  status: string | null;
}

export async function getServiceInfo(
  provider: string,
  authId?: string,
): Promise<ServiceInfo> {
  const empty: ServiceInfo = { scopes: [], metadata: null, status: null };

  if (!authId) {
    const session = await getServerSession();
    if (!session) return empty;
    authId = session.id;
  }

  const user = await db.user.findUnique({
    where: { cognitoId: authId },
    select: { id: true },
  });

  if (!user) return empty;

  const service = await db.connectedService.findUnique({
    where: {
      userId_provider: { userId: user.id, provider },
    },
    select: { scopes: true, metadata: true, status: true },
  });

  if (!service || service.status === "disconnected") return empty;

  return {
    scopes: service.scopes,
    metadata: service.metadata
      ? (service.metadata as Record<string, unknown>)
      : null,
    status: service.status,
  };
}

export async function disconnectService(provider: string, authId?: string) {
  if (!authId) {
    const session = await getServerSession();
    if (!session) throw new Error("Not authenticated");
    authId = session.id;
  }

  const user = await db.user.findUnique({
    where: { cognitoId: authId },
    select: { id: true },
  });

  if (!user) throw new Error("User not found");

  const service = await db.connectedService.findUnique({
    where: {
      userId_provider: { userId: user.id, provider },
    },
  });

  if (!service) throw new Error("Service not found");

  // Revoke tokens (best effort — if already revoked, that's fine)
  // Resend: no external revocation needed — API keys are user-managed
  if (provider === "google") {
    const revokeToken = service.refreshToken ?? service.accessToken;
    if (revokeToken) {
      try {
        const res = await fetch(
          `https://oauth2.googleapis.com/revoke?token=${revokeToken}`,
          { method: "POST" },
        );
        if (!res.ok && res.status !== 400) {
          console.warn(
            `Google revoke returned ${res.status}, proceeding with cleanup`,
          );
        }
      } catch (err) {
        console.warn(
          "Google revoke request failed, proceeding with cleanup",
          err,
        );
      }
    }
  }

  if (provider === "github") {
    if (service.accessToken) {
      try {
        const credentials = Buffer.from(
          `${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`,
        ).toString("base64");
        const res = await fetch(
          `https://api.github.com/applications/${process.env.GITHUB_CLIENT_ID}/grant`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Basic ${credentials}`,
              Accept: "application/vnd.github+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ access_token: service.accessToken }),
          },
        );
        if (!res.ok && res.status !== 404 && res.status !== 422) {
          console.warn(
            `GitHub revoke returned ${res.status}, proceeding with cleanup`,
          );
        }
      } catch (err) {
        console.warn(
          "GitHub revoke request failed, proceeding with cleanup",
          err,
        );
      }
    }
  }

  await db.connectedService.update({
    where: {
      userId_provider: { userId: user.id, provider },
    },
    data: {
      status: "disconnected",
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      scopes: [],
      metadata: Prisma.DbNull,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "disconnected_service",
      service: provider,
      status: "success",
      source: "app",
      metadata: { reason: "user_initiated" },
    },
  });
}

export interface GitHubOrgInfo {
  login: string;
  id: number;
  avatar_url: string;
  description: string | null;
}

export async function getGitHubOrgAccessUrl(): Promise<string | null> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return null;
  return `https://github.com/settings/connections/applications/${clientId}`;
}

export async function getGitHubOrgs(authId?: string): Promise<GitHubOrgInfo[]> {
  try {
    if (!authId) {
      const session = await getServerSession();
      if (!session) return [];
      authId = session.id;
    }

    const user = await db.user.findUnique({
      where: { cognitoId: authId },
      select: { id: true },
    });

    if (!user) return [];

    const service = await db.connectedService.findUnique({
      where: {
        userId_provider: { userId: user.id, provider: "github" },
      },
      select: { accessToken: true, status: true },
    });

    if (!service || service.status !== "connected" || !service.accessToken) {
      return [];
    }

    return fetchGitHubUserOrgs(service.accessToken);
  } catch {
    return [];
  }
}

export async function connectResendService(apiKey: string, authId?: string) {
  const trimmedKey = apiKey.trim();

  if (!authId) {
    const session = await getServerSession();
    if (!session) throw new Error("Not authenticated");
    authId = session.id;
  }

  const user = await db.user.findUnique({
    where: { cognitoId: authId },
    select: { id: true },
  });

  if (!user) throw new Error("User not found");

  const valid = await validateResendApiKey(trimmedKey);
  if (!valid) throw new Error("Invalid API key");

  const domains = await fetchResendDomains(trimmedKey);
  const domainsJson = domains.map((d) => ({ ...d }));
  const keyPreview = trimmedKey.slice(0, 12) + "...";

  await db.connectedService.upsert({
    where: {
      userId_provider: { userId: user.id, provider: "resend" },
    },
    create: {
      userId: user.id,
      provider: "resend",
      accessToken: trimmedKey,
      status: "connected",
      scopes: ["full_access"],
      metadata: { domains: domainsJson, keyPreview },
    },
    update: {
      accessToken: trimmedKey,
      status: "connected",
      scopes: ["full_access"],
      metadata: { domains: domainsJson, keyPreview },
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "connected_service",
      service: "resend",
      status: "success",
      source: "app",
      metadata: { keyPreview },
    },
  });
}

export async function getResendDomains(
  authId?: string,
): Promise<ResendDomain[]> {
  try {
    if (!authId) {
      const session = await getServerSession();
      if (!session) return [];
      authId = session.id;
    }

    const user = await db.user.findUnique({
      where: { cognitoId: authId },
      select: { id: true },
    });

    if (!user) return [];

    const service = await db.connectedService.findUnique({
      where: {
        userId_provider: { userId: user.id, provider: "resend" },
      },
      select: { accessToken: true, status: true },
    });

    if (!service || service.status !== "connected" || !service.accessToken) {
      return [];
    }

    return fetchResendDomains(service.accessToken);
  } catch {
    return [];
  }
}
