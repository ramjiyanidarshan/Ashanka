import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/verify
 * Returns the authenticated user's context. The proxy already verified the
 * token — if we reach here the request is authenticated.
 */
export async function GET(request: NextRequest) {
  const username = request.headers.get("x-auth-username");
  const sessionId = request.headers.get("x-session-id") ?? null;
  return NextResponse.json({ authenticated: true, username, sessionId });
}
