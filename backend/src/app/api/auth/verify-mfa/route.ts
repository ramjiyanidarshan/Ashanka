import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { authenticator } from "otplib";
import { UserModel } from "@/lib/model";
import { verifyToken, signToken, buildAuthCookieHeader } from "@/lib/auth";
import { parseUserAgent, SessionModel } from "@/lib/session";

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tempToken, code } = body;

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: "Token and code are required" },
        { status: 400 }
      );
    }

    const payload = await verifyToken(tempToken);

    if (!payload || !payload.mfaPending) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const user = await UserModel.findOne({ username: payload.username } as never);

    if (!user || !user.mfaSecret) {
      return NextResponse.json({ error: "Invalid user or MFA not enabled" }, { status: 400 });
    }

    const isValid = authenticator.check(code, user.mfaSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 });
    }

    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_MS);
    const ip = (request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "Unknown").split(",")[0].trim();
    const ua = request.headers.get("user-agent") ?? "";
    const { deviceType, os, browser } = parseUserAgent(ua);

    SessionModel.insertOne({
      sessionId,
      username: user.username,
      loginAt: now,
      lastActiveAt: now,
      expiresAt,
      status: "active",
      ipAddress: ip,
      userAgent: ua,
      deviceType,
      os,
      browser,
      auditLog: [{ timestamp: now, action: "auth.login_mfa", details: "Signed in with MFA" }],
    }).catch(console.error);

    const token = await signToken({ username: user.username, sessionId });
    const cookieHeader = buildAuthCookieHeader(token);

    return NextResponse.json(
      { success: true, username: user.username, token },
      { status: 200, headers: { "Set-Cookie": cookieHeader } }
    );
  } catch (error) {
    console.error("Verify MFA error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
