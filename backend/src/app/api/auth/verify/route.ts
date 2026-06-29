import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/verify
 * Returns the authenticated user's context. The proxy already verified the
 * token — if we reach here the request is authenticated.
 */
export async function GET(request: NextRequest) {
  const username = request.headers.get("x-auth-username");
  const role = request.headers.get("x-auth-role") || "enduser";
  const featuresHeader = request.headers.get("x-auth-features");
  let features = { vault: true };
  if (featuresHeader) {
    try { features = JSON.parse(featuresHeader); } catch {}
  }
  const sessionId = request.headers.get("x-session-id") ?? null;
  return NextResponse.json({ authenticated: true, username, role, features, sessionId });
}
