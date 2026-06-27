import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSetting, SETTING_KEYS } from "@/lib/settings";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

// ─── Decrypt helper ────────────────────────────────────────────────────────────
async function getAesKey(): Promise<Buffer> {
  const hex = await getSetting(SETTING_KEYS.AES_KEY);
  if (!hex || hex.length !== 64) throw new Error("AES key unavailable");
  return Buffer.from(hex, "hex");
}

function decryptWithKey(enc: string, key: Buffer): string {
  const parts = enc.split(":");
  if (parts.length !== 3) throw new Error("Not encrypted");
  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const ct = Buffer.from(parts[2], "base64");
  const d = crypto.createDecipheriv(ALGORITHM, key, iv);
  d.setAuthTag(authTag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

import { analyseStrength, type StrengthResult } from "@/lib/passwordStrength";

// ─── Overall security score ────────────────────────────────────────────────────
type SecurityLabel = "Critical" | "Poor" | "Fair" | "Good" | "Excellent";

function overallLabel(score: number): SecurityLabel {
  if (score >= 85) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 45) return "Fair";
  if (score >= 25) return "Poor";
  return "Critical";
}

// ─── Route ────────────────────────────────────────────────────────────────────
/**
 * GET /api/security/audit
 *
 * Decrypts all account passwords (server-side only — plaintext never leaves
 * the server), analyses them, and returns aggregate security metrics.
 */
export async function GET() {
  try {
    const db = await getDb();

    // Load rotation threshold from settings
    let rotationDays = 90;
    try {
      const v = await getSetting(SETTING_KEYS.PASSWORD_ROTATION_DAYS, "90");
      rotationDays = Math.max(1, parseInt(v, 10) || 90);
    } catch { /* use default */ }

    const key = await getAesKey();
    const now = Date.now();

    const accounts = await db.collection("accounts")
      .find({}, { projection: { serviceProvider: 1, attributes: 1, createdAt: 1, updatedAt: 1 } })
      .toArray();

    const breakdown = { veryWeak: 0, weak: 0, moderate: 0, strong: 0, veryStrong: 0 };

    // Detect duplicate passwords (hash-based, no plaintext in output)
    const pwdHashCount: Record<string, number> = {};

    // Per-account results
    const accountResults = accounts.map((acc) => {
      const attrs = (acc.attributes ?? {}) as Record<string, string | null>;

      // Decrypt password field (try common key variants)
      let pwdPlain: string | null = null;
      let hasPasswordField = false;
      for (const k of ["Password", "password", "Pass", "pass"]) {
        if (k in attrs) {
          hasPasswordField = true;
          const enc = attrs[k];
          if (enc) {
            try { pwdPlain = decryptWithKey(enc, key); break; } catch { /* skip */ }
          }
        }
      }

      if (!hasPasswordField) {
        return null;
      }

      const strength: StrengthResult = pwdPlain
        ? analyseStrength(pwdPlain)
        : { score: 0, label: "Very Weak", tips: ["No password found"] };

      // Track breakdown
      if      (strength.label === "Very Strong") breakdown.veryStrong++;
      else if (strength.label === "Strong")      breakdown.strong++;
      else if (strength.label === "Moderate")    breakdown.moderate++;
      else if (strength.label === "Weak")        breakdown.weak++;
      else                                        breakdown.veryWeak++;

      // Hash password for duplicate detection (SHA-256, truncated)
      let pwdHash: string | null = null;
      if (pwdPlain) {
        pwdHash = crypto.createHash("sha256").update(pwdPlain).digest("hex").slice(0, 16);
        pwdHashCount[pwdHash] = (pwdHashCount[pwdHash] ?? 0) + 1;
      }

      // Age calculation
      const lastUpdate = acc.updatedAt ? new Date(acc.updatedAt as Date).getTime() : (acc.createdAt ? new Date(acc.createdAt as Date).getTime() : null);
      const daysSinceUpdate = lastUpdate ? Math.floor((now - lastUpdate) / 86_400_000) : null;
      const needsRotation = daysSinceUpdate !== null && daysSinceUpdate >= rotationDays;

      let title: string | null = null;
      for (const k of ["Title", "title", "Label", "label"]) {
        if (attrs[k]) { title = attrs[k]; break; }
      }

      return {
        _id: (acc._id as { toString(): string }).toString(),
        provider: (acc.serviceProvider as string) ?? "Unknown",
        title,
        score: strength.score,
        label: strength.label,
        tips: strength.tips,
        daysSinceUpdate,
        needsRotation,
        pwdHash,  // used for duplicate detection; not returned
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    // Mark duplicates
    const issues = accountResults.map(({ pwdHash, ...rest }) => ({
      ...rest,
      isDuplicate: pwdHash ? pwdHashCount[pwdHash] > 1 : false,
    }));

    // Overall security score:
    // weighted average of password scores − penalties for rotation/duplicates
    const avgStrength = issues.length
      ? issues.reduce((s, a) => s + a.score, 0) / issues.length
      : 0;
    const rotationPenalty  = issues.filter((a) => a.needsRotation).length  / Math.max(issues.length, 1) * 20;
    const duplicatePenalty = issues.filter((a) => a.isDuplicate).length    / Math.max(issues.length, 1) * 15;
    const overallScore = Math.round(Math.max(0, Math.min(100, avgStrength - rotationPenalty - duplicatePenalty)));

    // Sort issues: worst first (low score, needs rotation, duplicate)
    issues.sort((a, b) => {
      const aRisk = (a.needsRotation ? 30 : 0) + (a.isDuplicate ? 20 : 0) + (100 - a.score);
      const bRisk = (b.needsRotation ? 30 : 0) + (b.isDuplicate ? 20 : 0) + (100 - b.score);
      return bRisk - aRisk;
    });

    return NextResponse.json({
      overallScore,
      scoreLabel: overallLabel(overallScore),
      rotationDays,
      summary: {
        total: issues.length,
        ...breakdown,
        needsRotation: issues.filter((a) => a.needsRotation).length,
        duplicates: issues.filter((a) => a.isDuplicate).length,
      },
      issues: issues.slice(0, 20),  // top 20 worst accounts
    });
  } catch (err) {
    console.error("Security audit error:", err);
    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}
