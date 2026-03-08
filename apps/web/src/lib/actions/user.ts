"use server";

import { db } from "@onecli/db";
import { getServerSession } from "@/lib/auth/server";

export async function getCurrentUser() {
  const session = await getServerSession();
  if (!session) return null;

  return getUserByAuthId(session.id);
}

export async function getUserByAuthId(authId: string) {
  const user = await db.user.findUnique({
    where: { cognitoId: authId },
    select: {
      id: true,
      email: true,
      name: true,
      apiKey: true,
      createdAt: true,
    },
  });

  return user;
}

export async function regenerateApiKey(authId?: string) {
  let id = authId;
  if (!id) {
    const session = await getServerSession();
    if (!session) throw new Error("Not authenticated");
    id = session.id;
  }

  const { randomBytes } = await import("crypto");
  const newKey = `oc_${randomBytes(24).toString("hex")}`;

  const user = await db.user.upsert({
    where: { cognitoId: id },
    create: {
      cognitoId: id,
      email: "",
      apiKey: newKey,
    },
    update: { apiKey: newKey },
    select: { apiKey: true },
  });

  return { apiKey: user.apiKey };
}

export async function updateProfile(data: { name: string; authId?: string }) {
  const name = data.name.trim();

  if (name.length === 0 || name.length > 255) {
    throw new Error("Name must be between 1 and 255 characters");
  }

  let id = data.authId;
  if (!id) {
    const session = await getServerSession();
    if (!session) throw new Error("Not authenticated");
    id = session.id;
  }

  const user = await db.user.update({
    where: { cognitoId: id },
    data: { name },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return user;
}
