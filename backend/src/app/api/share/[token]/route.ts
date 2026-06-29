import { NextRequest, NextResponse } from "next/server";
import { AccountModel, SharedLinkModel } from "@/lib/model";
import { decryptAttributes } from "@/lib/crypto";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/share/[token]
 * Public endpoint to retrieve a shared account.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    
    // Find the shared link by token
    const sharedLinks = await SharedLinkModel.findBy({ token });
    if (sharedLinks.length === 0) {
      return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
    }
    
    const sharedLink = sharedLinks[0];

    // Check expiration
    if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
      await SharedLinkModel.deleteOne(sharedLink._id!.toString());
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // Find the associated account
    const account = await AccountModel.findById(sharedLink.accountId);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Decrypt attributes
    const decryptedAttributes = await decryptAttributes(account.attributes);

    // Filter attributes based on allowedAttributes
    const filteredAttributes: Record<string, string | null> = {};
    for (const key of sharedLink.allowedAttributes) {
      if (key in decryptedAttributes) {
        filteredAttributes[key] = decryptedAttributes[key];
      }
    }

    // Return the safe data
    return NextResponse.json({
      serviceProvider: account.serviceProvider,
      attributes: filteredAttributes,
      updatedAt: account.updatedAt,
      expiresAt: sharedLink.expiresAt,
    });
  } catch (error) {
    console.error("GET /api/share/[token] error:", error);
    return NextResponse.json({ error: "Failed to fetch shared link" }, { status: 500 });
  }
}
