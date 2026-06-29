import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/providers
 * Returns all unique service provider names, sorted alphabetically.
 */
export async function GET() {
  try {
    const db = await getDb();
    const providers = await db.collection("accounts").distinct("serviceProvider", { isVault: { $ne: true } });
    const sorted = (providers as string[]).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    return NextResponse.json({ providers: sorted });
  } catch (error) {
    console.error("GET /api/providers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}
