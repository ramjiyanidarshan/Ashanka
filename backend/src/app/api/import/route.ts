import { NextRequest, NextResponse } from "next/server";
import { AccountModel } from "@/lib/model";
import { decryptAttributes } from "@/lib/crypto";

/**
 * POST /api/import
 * Accepts a JSON body matching the Veshtit format:
 * {
 *   "Service Provider 1": [{ "E-Mail": "...", "Password": "..." }],
 *   "Service Provider 2": [...]
 * }
 *
 * Returns:
 * - `toInsert`: entries that are new (no conflict) — auto-importable
 * - `conflicts`: entries that already exist — user must choose: ignore/update/add_new
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid JSON format. Expected an object with provider keys." },
        { status: 400 }
      );
    }

    const toInsert: Array<{
      serviceProvider: string;
      attributes: Record<string, string | null>;
    }> = [];

    const conflicts: Array<{
      incoming: {
        serviceProvider: string;
        attributes: Record<string, string | null>;
      };
      existing: {
        id: string;
        serviceProvider: string;
        attributes: Record<string, string | null>;
        createdAt: Date;
        updatedAt: Date;
      };
    }> = [];

    for (const [serviceProvider, entries] of Object.entries(body)) {
      if (!Array.isArray(entries)) continue;

      for (const rawEntry of entries) {
        const attributes: Record<string, string | null> = {};

        // Normalize all values to string | null
        for (const [key, value] of Object.entries(rawEntry)) {
          if (value === null || value === undefined) {
            attributes[key] = null;
          } else {
            attributes[key] = String(value);
          }
        }

        // Check for existing entries with the same serviceProvider
        const existingEntries = await AccountModel.findBy({
          serviceProvider,
          isVault: { $ne: true },
        } as never);

        // Find a conflict: an existing entry that shares at least one matching
        // non-null attribute value (e.g. same email or same username)
        let conflictFound = false;

        for (const existing of existingEntries) {
          const decryptedExisting = await decryptAttributes(existing.attributes);

          // Check for attribute key+value overlap to detect duplicates
          const sharedKeys = Object.keys(attributes).filter(
            (k) => k in decryptedExisting
          );

          const hasValueMatch = sharedKeys.some(
            (k) =>
              attributes[k] !== null &&
              decryptedExisting[k] !== null &&
              attributes[k] === decryptedExisting[k]
          );

          if (hasValueMatch) {
            conflicts.push({
              incoming: { serviceProvider, attributes },
              existing: {
                id: existing._id!.toString(),
                serviceProvider: existing.serviceProvider,
                attributes: decryptedExisting,
                createdAt: existing.createdAt,
                updatedAt: existing.updatedAt,
              },
            });
            conflictFound = true;
            break;
          }
        }

        if (!conflictFound) {
          toInsert.push({ serviceProvider, attributes });
        }
      }
    }

    return NextResponse.json({
      toInsert,
      conflicts,
      summary: {
        newCount: toInsert.length,
        conflictCount: conflicts.length,
      },
    });
  } catch (error) {
    console.error("POST /api/import error:", error);
    return NextResponse.json(
      { error: "Failed to parse import data" },
      { status: 500 }
    );
  }
}
