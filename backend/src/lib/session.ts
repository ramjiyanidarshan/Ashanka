import type { MinimalDocument } from "./model";
import { Model } from "./model";
import type { ObjectId } from "mongodb";
import { getDb } from "./db";

export interface SessionAuditEntry {
  timestamp: Date;
  action: string;
  details: string;
}

export interface SessionDocument extends MinimalDocument {
  _id?: ObjectId;
  sessionId: string;
  userId: string;
  username: string;
  loginAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  logoutAt?: Date;
  terminatedAt?: Date;
  vaultUnlockedUntil?: Date;
  status: "active" | "expired" | "logged_out" | "terminated";
  ipAddress: string;
  userAgent: string;
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  os: string;
  browser: string;
  auditLog: SessionAuditEntry[];
}

export const SessionModel = new Model<SessionDocument>("sessions");

// ── User-Agent parsing ────────────────────────────────────────────────────────

export function parseUserAgent(ua: string): {
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  os: string;
  browser: string;
} {
  let deviceType: "mobile" | "tablet" | "desktop" | "unknown";

  if (/ipad/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    deviceType = "tablet";
  } else if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    deviceType = "mobile";
  } else if (/windows|macintosh|linux|cros/i.test(ua)) {
    deviceType = "desktop";
  } else {
    deviceType = "unknown";
  }

  let os = "Unknown";
  if (/windows nt 10|windows 11/i.test(ua)) os = "Windows 10/11";
  else if (/windows nt 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/windows nt 6\.1/i.test(ua)) os = "Windows 7";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/iphone os (\d+)/i.test(ua)) {
    const m = ua.match(/iphone os (\d+)/i);
    os = m ? `iOS ${m[1]}` : "iOS";
  } else if (/ipad.*os (\d+)/i.test(ua)) {
    const m = ua.match(/os (\d+)/i);
    os = m ? `iPadOS ${m[1]}` : "iPadOS";
  } else if (/android (\d+)/i.test(ua)) {
    const m = ua.match(/android (\d+)/i);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/mac os x (\d+)[_.](\d+)/i.test(ua)) {
    const m = ua.match(/mac os x (\d+)[_.](\d+)/i);
    os = m ? `macOS ${m[1]}.${m[2]}` : "macOS";
  } else if (/cros/i.test(ua)) os = "ChromeOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Unknown";
  if (/edg\/(\d+)/i.test(ua)) {
    const m = ua.match(/edg\/(\d+)/i);
    browser = m ? `Edge ${m[1]}` : "Edge";
  } else if (/opr\/|opera/i.test(ua)) {
    browser = "Opera";
  } else if (/firefox\/(\d+)/i.test(ua)) {
    const m = ua.match(/firefox\/(\d+)/i);
    browser = m ? `Firefox ${m[1]}` : "Firefox";
  } else if (/chrome\/(\d+)/i.test(ua)) {
    const m = ua.match(/chrome\/(\d+)/i);
    browser = m ? `Chrome ${m[1]}` : "Chrome";
  } else if (/version\/(\d+).*safari/i.test(ua)) {
    const m = ua.match(/version\/(\d+)/i);
    browser = m ? `Safari ${m[1]}` : "Safari";
  } else if (/safari/i.test(ua)) {
    browser = "Safari";
  }

  return { deviceType, os, browser };
}

// ── Audit helpers ─────────────────────────────────────────────────────────────

/**
 * Appends an audit entry to a session's auditLog and bumps lastActiveAt.
 * Failures are swallowed — audit logging must never break a main operation.
 */
export async function appendAuditEntry(
  sessionId: string | null | undefined,
  action: string,
  details: string
): Promise<void> {
  if (!sessionId) return;
  try {
    const db = await getDb();
    const entry: SessionAuditEntry = {
      timestamp: new Date(),
      action,
      details,
    };
    await db.collection("sessions").updateOne(
      { sessionId },
      {
        $push: { auditLog: entry } as any,
        $set: { lastActiveAt: new Date(), updatedAt: new Date() },
      }
    );
  } catch {
    // Non-critical
  }
}
