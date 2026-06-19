import { NextRequest, NextResponse } from "next/server";
import { buildClearCookieHeader } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const sessionId = request.headers.get("x-session-id");

  if (sessionId) {
    const now = new Date();
    try {
      const db = await getDb();
      await db.collection("sessions").updateOne(
        { sessionId },
        {
          $set: { status: "logged_out", logoutAt: now, updatedAt: now },
          $push: {
            auditLog: { timestamp: now, action: "auth.logout", details: "Signed out" },
          } as any,
        }
      );
    } catch {
      // Session update failure must not block logout
    }
  }

  return NextResponse.json(
    { success: true },
    {
      status: 200,
      headers: { "Set-Cookie": buildClearCookieHeader() },
    }
  );
}
