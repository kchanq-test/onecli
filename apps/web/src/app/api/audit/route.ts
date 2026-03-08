import { NextRequest, NextResponse } from "next/server";
import { db, Prisma } from "@onecli/db";
import { z } from "zod";

const MAX_METADATA_SIZE = 4096;

const auditLogSchema = z.object({
  action: z.string().min(1).max(255),
  service: z.string().min(1).max(100),
  status: z.enum(["success", "denied", "error"]),
  source: z.enum(["app", "cli"]).default("cli"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = auditLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { action, service, status, source, metadata } = parsed.data;

    // Enforce a size limit on metadata to prevent storage abuse
    if (metadata && JSON.stringify(metadata).length > MAX_METADATA_SIZE) {
      return NextResponse.json(
        { error: `Metadata must be under ${MAX_METADATA_SIZE} bytes` },
        { status: 400 },
      );
    }

    const log = await db.auditLog.create({
      data: {
        userId: user.id,
        action,
        service,
        status,
        source,
        metadata:
          metadata !== null && metadata !== undefined
            ? (metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
      select: {
        id: true,
        action: true,
        service: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
