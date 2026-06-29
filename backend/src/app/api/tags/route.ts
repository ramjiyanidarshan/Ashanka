import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/tags
 * Returns all unique tags used across accounts.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-auth-userid");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const allTags = await db.collection("accounts").distinct("tags", { isVault: { $ne: true }, userId });
    const tags = (allTags as unknown[])
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .sort();
    return NextResponse.json({ tags });
  } catch (error) {
    console.error("GET /api/tags error:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}
