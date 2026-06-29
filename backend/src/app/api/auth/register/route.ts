import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { UserModel } from "@/lib/model";
import { signToken, buildAuthCookieHeader } from "@/lib/auth";
import { parseUserAgent, SessionModel } from "@/lib/session";

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if email or username already exists
    const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] } as never);
    if (existingUser) {
      return NextResponse.json({ error: "Username or email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await UserModel.insertOne({
      username,
      email,
      passwordHash,
      mfaEnabled: false,
      role: "enduser",
      status: "active",
      features: {
        vault: true,
      },
    });

    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_MS);
    const ip = (request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "Unknown").split(",")[0].trim();
    const ua = request.headers.get("user-agent") ?? "";
    const { deviceType, os, browser } = parseUserAgent(ua);

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
      auditLog: [{ timestamp: now, action: "auth.register", details: "Account created and signed in" }],
    }).catch(console.error);

    const token = await signToken({ userId: user._id!.toString(), username: user.username, sessionId, role: user.role, status: user.status, features: user.features });
    const cookieHeader = buildAuthCookieHeader(token);

    return NextResponse.json(
      { success: true, username: user.username, token },
      { status: 201, headers: { "Set-Cookie": cookieHeader } }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
