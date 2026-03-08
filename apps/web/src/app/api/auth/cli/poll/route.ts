import { NextRequest, NextResponse } from "next/server";
import { db } from "@onecli/db";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Missing code parameter" },
        { status: 400 },
      );
    }

    const session = await db.cliAuthSession.findUnique({ where: { code } });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.expiresAt < new Date()) {
      await db.cliAuthSession.delete({ where: { code } });
      return NextResponse.json({ status: "expired" }, { status: 410 });
    }

    if (session.status === "confirmed" && session.apiKey) {
      // One-time read: delete the session after returning the key
      await db.cliAuthSession.delete({ where: { code } });
      return NextResponse.json({
        status: "ok",
        api_key: session.apiKey,
        email: session.email,
      });
    }

    return NextResponse.json({ status: "pending" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
