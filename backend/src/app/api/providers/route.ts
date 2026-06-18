import { NextResponse } from "next/server";
import { AccountModel } from "@/lib/model";

/**
 * GET /api/providers
 * Returns all unique service provider names, sorted alphabetically.
 */
export async function GET() {
  try {
    const providers = await AccountModel.distinct("serviceProvider");
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
