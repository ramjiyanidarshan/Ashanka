import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { getDb } from "./db";
import { UserModel } from "./model";
import { getSetting, setSetting, SETTING_KEYS } from "./settings";
import { appendAuditEntry } from "./session";

const DEFAULT_VAULT_UNLOCK_MINUTES = 10;

export function clampVaultUnlockMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VAULT_UNLOCK_MINUTES;
  return Math.min(120, Math.max(1, Math.round(value)));
}

export async function getVaultUnlockMinutes(): Promise<number> {
  try {
    const raw = await getSetting(
      SETTING_KEYS.VAULT_UNLOCK_MINUTES,
      String(DEFAULT_VAULT_UNLOCK_MINUTES)
    );
    return clampVaultUnlockMinutes(Number.parseInt(raw, 10));
  } catch {
    return DEFAULT_VAULT_UNLOCK_MINUTES;
  }
}

export async function setVaultUnlockMinutes(value: number): Promise<number> {
  const minutes = clampVaultUnlockMinutes(value);
  await setSetting(SETTING_KEYS.VAULT_UNLOCK_MINUTES, String(minutes));
  return minutes;
}

export async function getVaultStatus(request: NextRequest) {
  const userId = request.headers.get("x-auth-userid") ?? "";
  const sessionId = request.headers.get("x-session-id") ?? "";
  const user = userId ? await UserModel.findById(userId) : null;
  const unlockMinutes = await getVaultUnlockMinutes();
  const unlockedUntil = sessionId ? await getVaultUnlockedUntil(sessionId) : null;
  const now = Date.now();

  return {
    mfaEnabled: !!user?.mfaEnabled,
    unlocked: !!unlockedUntil && unlockedUntil.getTime() > now,
    unlockedUntil: unlockedUntil?.toISOString() ?? null,
    unlockMinutes,
  };
}

export async function verifyVaultCodeAndUnlock(
  request: NextRequest,
  code: string
): Promise<{ ok: true; unlockedUntil: Date; unlockMinutes: number } | { ok: false; response: NextResponse }> {
  const featuresHeader = request.headers.get("x-auth-features");
  if (featuresHeader) {
    try {
      const features = JSON.parse(featuresHeader);
      if (features.vault === false) {
        return { ok: false, response: NextResponse.json({ error: "सन्दूक feature is disabled for your account" }, { status: 403 }) };
      }
    } catch {}
  }

  const userId = request.headers.get("x-auth-userid") ?? "";
  const sessionId = request.headers.get("x-session-id") ?? "";

  if (!sessionId || !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Active session is required" }, { status: 401 }),
    };
  }

  const user = await UserModel.findById(userId);
  if (!user?.mfaEnabled || !user.mfaSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Enable MFA before using सन्दूक", mfaRequired: true },
        { status: 403 }
      ),
    };
  }

  if (!code || !authenticator.check(code, user.mfaSecret)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 }),
    };
  }

  const unlockMinutes = await getVaultUnlockMinutes();
  const unlockedUntil = new Date(Date.now() + unlockMinutes * 60_000);
  const db = await getDb();
  await db.collection("sessions").updateOne(
    { sessionId },
    { $set: { vaultUnlockedUntil: unlockedUntil, lastActiveAt: new Date(), updatedAt: new Date() } }
  );
  await appendAuditEntry(sessionId, "vault.unlocked", `सन्दूक unlocked for ${unlockMinutes} minute(s)`);

  return { ok: true, unlockedUntil, unlockMinutes };
}

export async function requireVaultUnlocked(request: NextRequest): Promise<NextResponse | null> {
  const featuresHeader = request.headers.get("x-auth-features");
  if (featuresHeader) {
    try {
      const features = JSON.parse(featuresHeader);
      if (features.vault === false) {
        return NextResponse.json({ error: "सन्दूक feature is disabled for your account" }, { status: 403 });
      }
    } catch {}
  }

  const status = await getVaultStatus(request);

  if (!status.mfaEnabled) {
    return NextResponse.json(
      { error: "Enable MFA before using सन्दूक", mfaRequired: true },
      { status: 403 }
    );
  }

  if (!status.unlocked) {
    return NextResponse.json(
      { error: "सन्दूक is locked", vaultLocked: true, unlockedUntil: status.unlockedUntil },
      { status: 423 }
    );
  }

  return null;
}

async function getVaultUnlockedUntil(sessionId: string): Promise<Date | null> {
  const db = await getDb();
  const session = await db
    .collection("sessions")
    .findOne({ sessionId }, { projection: { vaultUnlockedUntil: 1 } });
  const value = session?.vaultUnlockedUntil;
  return value ? new Date(value as Date) : null;
}
