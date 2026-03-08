"use server";

import { randomBytes } from "crypto";
import { db } from "@onecli/db";

function generateApiKey() {
  return `oc_${randomBytes(24).toString("hex")}`;
}

interface EnsureUserInput {
  authId: string;
  email: string;
  name?: string;
}

export async function ensureUser(input: EnsureUserInput) {
  const user = await db.user.upsert({
    where: { cognitoId: input.authId },
    create: {
      cognitoId: input.authId,
      email: input.email,
      name: input.name,
      apiKey: generateApiKey(),
    },
    update: {
      email: input.email,
      name: input.name,
    },
    select: { id: true, apiKey: true },
  });

  return { id: user.id };
}

interface ConfirmCliSessionInput {
  code: string;
  authId: string;
  email: string;
  name?: string;
}

export async function confirmCliSession(
  input: ConfirmCliSessionInput,
): Promise<{
  status: "ok" | "expired" | "not_found" | "error";
  apiKey?: string;
}> {
  try {
    const cliSession = await db.cliAuthSession.findUnique({
      where: { code: input.code },
    });

    if (!cliSession) {
      return { status: "not_found" };
    }

    if (cliSession.expiresAt < new Date()) {
      await db.cliAuthSession.delete({ where: { code: input.code } });
      return { status: "expired" };
    }

    const user = await db.user.upsert({
      where: { cognitoId: input.authId },
      create: {
        cognitoId: input.authId,
        email: input.email,
        name: input.name,
        apiKey: generateApiKey(),
      },
      update: {
        email: input.email,
        name: input.name,
      },
      select: { apiKey: true, email: true, id: true },
    });

    await db.cliAuthSession.update({
      where: { code: input.code },
      data: {
        status: "confirmed",
        userId: user.id,
        apiKey: user.apiKey,
        email: user.email,
      },
    });

    return { status: "ok", apiKey: user.apiKey };
  } catch (err) {
    console.error("CLI auth confirm error:", err);
    return { status: "error" };
  }
}
