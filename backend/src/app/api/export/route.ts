import { NextResponse } from "next/server";
import { AccountModel } from "@/lib/model";
import { decryptAttributes } from "@/lib/crypto";

/**
 * GET /api/export
 * Exports all accounts back to the original Veshtit JSON format:
 * {
 *   "Service Provider 1": [{ "E-Mail": "...", "Password": "..." }],
 *   ...
 * }
 * All attribute values are decrypted before export.
 */
export async function GET() {
  try {
    const accounts = (await AccountModel.findAll()).filter((account) => account.isVault !== true);

    const exportData: Record<string, Record<string, string | null>[]> = {};

    for (const account of accounts) {
      const { serviceProvider, attributes } = account;
      const decrypted = await decryptAttributes(attributes);

      if (!exportData[serviceProvider]) {
        exportData[serviceProvider] = [];
      }
      exportData[serviceProvider].push(decrypted);
    }

    const json = JSON.stringify(exportData, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ashanka-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json(
      { error: "Failed to export accounts" },
      { status: 500 }
    );
  }
}
