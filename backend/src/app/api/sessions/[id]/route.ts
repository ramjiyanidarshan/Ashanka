import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * DELETE /api/sessions/:id — terminate a session by sessionId.
 * Cannot terminate the caller's own active session.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const currentSessionId = request.headers.get("x-session-id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    if (sessionId === currentSessionId) {
      return NextResponse.json(
        { error: "Cannot terminate your current session. Use logout instead." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const session = await db.collection("sessions").findOne({ sessionId });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: `Session is already ${session.status}` },
        { status: 400 }
      );
    }

    const now = new Date();
    await db.collection("sessions").updateOne(
      { sessionId },
      {
        $set: { status: "terminated", terminatedAt: now, updatedAt: now },
        $push: {
          auditLog: {
            timestamp: now,
            action: "auth.terminated",
            details: "Session terminated by admin",
          },
        } as any,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sessions/[id] error:", error);
    return NextResponse.json({ error: "Failed to terminate session" }, { status: 500 });
  }
}
