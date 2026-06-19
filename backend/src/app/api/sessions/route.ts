import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/sessions
 * Returns all sessions sorted by loginAt descending.
 * Also auto-expires sessions whose JWT expiry has passed.
 * Includes currentSessionId derived from x-session-id header (set by proxy).
 */
export async function GET(request: NextRequest) {
  try {
    const currentSessionId = request.headers.get("x-session-id") ?? null;
    const db = await getDb();

    const sessions = await db
      .collection("sessions")
      .find({})
      .sort({ loginAt: -1 })
      .toArray();

    const now = new Date();

    // Auto-expire sessions where the JWT would have expired but status is still active
    const processed = await Promise.all(
      sessions.map(async (s) => {
        if (s.status === "active" && s.expiresAt && new Date(s.expiresAt) < now) {
          await db.collection("sessions").updateOne(
            { _id: s._id },
            { $set: { status: "expired", updatedAt: now } }
          );
          return { ...s, status: "expired" };
        }
        return s;
      })
    );

    return NextResponse.json({
      sessions: processed.map((s) => ({ ...s, _id: s._id?.toString() })),
      currentSessionId,
    });
  } catch (error) {
    console.error("GET /api/sessions error:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}
