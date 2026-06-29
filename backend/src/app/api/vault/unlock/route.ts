import { NextRequest, NextResponse } from "next/server";
import { verifyVaultCodeAndUnlock } from "@/lib/vault";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const result = await verifyVaultCodeAndUnlock(request, String(code ?? ""));
    if (!result.ok) return result.response;

    return NextResponse.json({
      success: true,
      unlockedUntil: result.unlockedUntil.toISOString(),
      unlockMinutes: result.unlockMinutes,
    });
  } catch (error) {
    console.error("POST /api/vault/unlock error:", error);
    return NextResponse.json({ error: "Failed to unlock सन्दूक" }, { status: 500 });
  }
}
