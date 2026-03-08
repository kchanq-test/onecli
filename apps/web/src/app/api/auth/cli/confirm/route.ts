import { NextRequest, NextResponse } from "next/server";
import { db } from "@onecli/db";
import { getServerSession } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Missing code parameter" },
        { status: 400 },
      );
    }

    const cliSession = await db.cliAuthSession.findUnique({
      where: { code },
    });

    if (!cliSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (cliSession.expiresAt < new Date()) {
      await db.cliAuthSession.delete({ where: { code } });
      return NextResponse.json({ status: "expired" }, { status: 410 });
    }

    // Upsert user in DB directly (avoids server action context issues)
    const user = await db.user.upsert({
      where: { cognitoId: session.id },
      create: {
        cognitoId: session.id,
        email: session.email,
        name: session.name,
      },
      update: {
        email: session.email,
        name: session.name,
      },
      select: { apiKey: true, email: true, id: true },
    });

    await db.cliAuthSession.update({
      where: { code },
      data: {
        status: "confirmed",
        userId: user.id,
        apiKey: user.apiKey,
        email: user.email,
      },
    });

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("CLI auth confirm error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
