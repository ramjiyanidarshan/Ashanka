import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { UserModel } from "@/lib/model";
import { signToken, signTempToken, buildAuthCookieHeader } from "@/lib/auth";
import { parseUserAgent, SessionModel } from "@/lib/session";

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Email/Username and password are required" },
        { status: 400 }
      );
    }

    // `username` could be either username or email
    const user = await UserModel.findOne({ $or: [{ email: username }, { username: username }] } as never);

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.mfaEnabled) {
      const tempToken = await signTempToken({ userId: user._id!.toString(), username: user.username, mfaPending: true });
      return NextResponse.json(
        { success: true, mfaRequired: true, tempToken },
        { status: 200 }
      );
    }

    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_MS);
    const ip = (request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "Unknown").split(",")[0].trim();
    const ua = request.headers.get("user-agent") ?? "";
    const { deviceType, os, browser } = parseUserAgent(ua);

    // Create session record (fire-and-forget — must not block login)
    SessionModel.insertOne({
      sessionId,
      userId: user._id!.toString(),
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
      auditLog: [{ timestamp: now, action: "auth.login", details: "Signed in" }],
    }).catch(console.error);

    const token = await signToken({ userId: user._id!.toString(), username: user.username, sessionId, role: user.role, status: user.status, features: user.features });
    const cookieHeader = buildAuthCookieHeader(token);

    return NextResponse.json(
      { success: true, username: user.username, token },
      { status: 200, headers: { "Set-Cookie": cookieHeader } }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
