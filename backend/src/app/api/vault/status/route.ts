import { NextRequest, NextResponse } from "next/server";
import { getVaultStatus } from "@/lib/vault";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getVaultStatus(request));
  } catch (error) {
    console.error("GET /api/vault/status error:", error);
    return NextResponse.json({ error: "Failed to load सन्दूक status" }, { status: 500 });
  }
}
