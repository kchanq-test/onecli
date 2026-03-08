import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@onecli/db";

export async function POST() {
  try {
    // Generate a cryptographically secure code server-side instead of
    // accepting a client-provided value, which could be predictable.
    const code = randomBytes(24).toString("hex"); // 48 hex chars, 192 bits

    await db.cliAuthSession.create({
      data: {
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    return NextResponse.json({ status: "ok", code });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
