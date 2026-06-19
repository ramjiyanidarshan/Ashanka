import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const PUBLIC_PATHS = ["/api/auth/login", "/api/auth/verify-mfa"];

// ── In-memory terminated-session cache ───────────────────────────────────────
// Refreshed from DB at most once per minute to avoid per-request DB hits.
let _terminatedCache: Set<string> = new Set();
let _terminatedCacheTs = 0;

async function isSessionTerminated(sessionId: string): Promise<boolean> {
  const now = Date.now();
  if (now - _terminatedCacheTs > 60_000) {
    try {
      const { getDb } = await import("./lib/db");
      const db = await getDb();
      const docs = await db
        .collection("sessions")
        .find({ status: "terminated" }, { projection: { sessionId: 1 } })
        .toArray();
      _terminatedCache = new Set(docs.map((d: any) => d.sessionId as string));
      _terminatedCacheTs = now;
    } catch {
      // Cache refresh failed — use stale data
    }
  }
  return _terminatedCache.has(sessionId);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  // Only protect /api/* routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized: No token provided" },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or expired token" },
      { status: 401 }
    );
  }

  // Reject requests from terminated sessions
  if (payload.sessionId && (await isSessionTerminated(payload.sessionId))) {
    return NextResponse.json(
      { error: "Unauthorized: Session has been terminated" },
      { status: 401 }
    );
  }

  // Forward auth context for downstream route handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-auth-username", payload.username);
  if (payload.sessionId) {
    requestHeaders.set("x-session-id", payload.sessionId);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/api/:path*"],
};
