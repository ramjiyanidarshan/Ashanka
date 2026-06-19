import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSetting, setSetting, invalidateSetting, SETTING_KEYS } from "@/lib/settings";
import { UserModel } from "@/lib/model";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const ENV_PATH = path.resolve(process.cwd(), ".env");

/** Read a single key from the .env file */
function readEnvKey(key: string): string {
  try {
    const content = fs.readFileSync(ENV_PATH, "utf-8");
    const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

/** Mask a secret — show first 4 and last 4 chars */
function mask(val: string): string {
  if (!val || val.length < 10) return "••••••••";
  return `${val.slice(0, 4)}${"•".repeat(Math.max(val.length - 8, 4))}${val.slice(-4)}`;
}

/**
 * GET /api/settings
 * Returns masked configuration info and DB connection status.
 * AES key and JWT secret come from the DB (or .env bootstrap).
 */
export async function GET() {
  let dbStatus: "connected" | "error" = "error";
  let dbLatencyMs: number | null = null;

  try {
    const t0 = Date.now();
    const db = await getDb();
    await db.command({ ping: 1 });
    dbLatencyMs = Date.now() - t0;
    dbStatus = "connected";
  } catch {
    dbStatus = "error";
  }

  // Load keys from DB
  let aesKeyMasked = "••••••••";
  let jwtSecretMasked = "••••••••";
  try {
    const aesKey = await getSetting(SETTING_KEYS.AES_KEY, process.env.AES_ENCRYPTION_KEY);
    aesKeyMasked = mask(aesKey);
  } catch { /* not yet set */ }

  try {
    const jwtSecret = await getSetting(SETTING_KEYS.JWT_SECRET, process.env.JWT_SECRET);
    jwtSecretMasked = mask(jwtSecret);
  } catch { /* not yet set */ }

  let rotationDays = 90;
  try {
    const v = await getSetting(SETTING_KEYS.PASSWORD_ROTATION_DAYS, "90");
    rotationDays = Math.max(1, parseInt(v, 10) || 90);
  } catch { /* use default */ }

  const adminUser = await UserModel.findOne({});

  return NextResponse.json({
    security: {
      username: adminUser?.username || "admin",
      mfaEnabled: adminUser?.mfaEnabled || false,
    },
    encryption: {
      keyMasked: aesKeyMasked,
      algorithm: "AES-256-GCM",
    },
    jwt: {
      secretMasked: jwtSecretMasked,
    },
    database: {
      uriMasked: mask(readEnvKey("MONGODB_URI")),
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    policy: {
      passwordRotationDays: rotationDays,
    },
  });
}

/**
 * PUT /api/settings
 * Actions:
 *   - changePassword  (stays in .env — APP_PASSWORD)
 *   - updateAesKey    (stored in DB)
 *   - updateJwtSecret (stored in DB, invalidates all sessions)
 *   - testDb
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── Change admin password (stored in DB) ─────────────────────────────────
    if (action === "changePassword") {
      const { currentPassword, newPassword, confirmPassword } = body;

      const adminUser = await UserModel.findOne({});
      if (!adminUser) {
        return NextResponse.json({ error: "Admin user not found in DB" }, { status: 404 });
      }

      const isValid = await bcrypt.compare(currentPassword, adminUser.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      adminUser.passwordHash = newHash;
      await adminUser.save();

      return NextResponse.json({ ok: true, message: "Password updated in database. Please log in again." });
    }

    // ── Update AES Encryption Key (stored in DB, re-encrypts all accounts) ───
    if (action === "updateAesKey") {
      const { newKey } = body as { newKey: string };

      if (!newKey || newKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(newKey)) {
        return NextResponse.json(
          { error: "AES key must be a 64-character hex string (32 bytes)." },
          { status: 400 }
        );
      }

      // Get current key for re-encryption
      let oldKey: string;
      try {
        oldKey = await getSetting(SETTING_KEYS.AES_KEY, process.env.AES_ENCRYPTION_KEY);
      } catch {
        return NextResponse.json({ error: "No current AES key found." }, { status: 500 });
      }

      if (oldKey === newKey) {
        return NextResponse.json({ ok: true, message: "Key is already set to that value." });
      }

      // Re-encrypt all accounts
      const { reEncryptAttributes } = await import("@/lib/crypto");
      const { invalidateSetting } = await import("@/lib/settings");
      const db = await getDb();
      const col = db.collection("accounts");
      const accounts = await col.find({}).toArray();

      let reEncryptedCount = 0;
      for (const account of accounts) {
        try {
          const newAttrs = await reEncryptAttributes(
            account.attributes as Record<string, string | null>,
            oldKey,
            newKey
          );
          await col.updateOne(
            { _id: account._id },
            { $set: { attributes: newAttrs, updatedAt: new Date() } }
          );
          reEncryptedCount++;
        } catch (err) {
          console.error(`Failed to re-encrypt account ${account._id}:`, err);
        }
      }

      // Save new key to DB and invalidate cache
      const { setSetting } = await import("@/lib/settings");
      await setSetting(SETTING_KEYS.AES_KEY, newKey);
      invalidateSetting(SETTING_KEYS.AES_KEY);

      return NextResponse.json({
        ok: true,
        message: `AES key updated. ${reEncryptedCount} account(s) re-encrypted.`,
      });
    }

    // ── Update JWT Secret (stored in DB) ─────────────────────────────────────
    if (action === "updateJwtSecret") {
      const { newSecret } = body as { newSecret: string };

      if (!newSecret || newSecret.length < 32) {
        return NextResponse.json(
          { error: "JWT secret must be at least 32 characters." },
          { status: 400 }
        );
      }

      const { setSetting, invalidateSetting } = await import("@/lib/settings");
      const { invalidateJwtCache } = await import("@/lib/auth");

      await setSetting(SETTING_KEYS.JWT_SECRET, newSecret);
      invalidateSetting(SETTING_KEYS.JWT_SECRET);
      invalidateJwtCache();

      return NextResponse.json({
        ok: true,
        message: "JWT secret updated. All existing sessions are now invalid — please log in again.",
      });
    }

    // ── Ping DB ───────────────────────────────────────────────────────────────
    if (action === "testDb") {
      try {
        const t0 = Date.now();
        const db = await getDb();
        await db.command({ ping: 1 });
        const latencyMs = Date.now() - t0;
        return NextResponse.json({ status: "connected", latencyMs });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ status: "error", error: msg });
      }
    }

    // ── Update password policy ────────────────────────────────────────────────
    if (action === "updatePasswordPolicy") {
      const { passwordRotationDays } = body as { passwordRotationDays?: number };
      if (!passwordRotationDays || typeof passwordRotationDays !== "number" || passwordRotationDays < 1) {
        return NextResponse.json({ error: "passwordRotationDays must be a positive number" }, { status: 400 });
      }
      await setSetting(SETTING_KEYS.PASSWORD_ROTATION_DAYS, String(Math.round(passwordRotationDays)));
      return NextResponse.json({ ok: true, message: `Password rotation reminder set to ${Math.round(passwordRotationDays)} days.` });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Settings PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
