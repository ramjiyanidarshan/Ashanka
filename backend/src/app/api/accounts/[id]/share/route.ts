import { NextRequest, NextResponse } from "next/server";
import { AccountModel, SharedLinkModel } from "@/lib/model";
import { requireVaultUnlocked } from "@/lib/vault";
import crypto from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/accounts/[id]/share
 * Creates a new shared link (magic link) for a specific account.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { expiresIn, allowedAttributes } = body;

    const account = await AccountModel.findById(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // If the account is in the vault, ensure the vault is unlocked
    if (account.isVault) {
      const lockedResponse = await requireVaultUnlocked(request);
      if (lockedResponse) return lockedResponse;
    }

    if (!Array.isArray(allowedAttributes)) {
      return NextResponse.json({ error: "allowedAttributes must be an array" }, { status: 400 });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");

    let expiresAt = null;
    if (typeof expiresIn === "number") {
      expiresAt = new Date(Date.now() + expiresIn);
    }

    await SharedLinkModel.insertOne({
      accountId: id,
      token,
      expiresAt,
      allowedAttributes,
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("POST /api/accounts/[id]/share error:", error);
    return NextResponse.json({ error: "Failed to create shared link" }, { status: 500 });
  }
}

/**
 * GET /api/accounts/[id]/share
 * Lists active shared links for a specific account.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const account = await AccountModel.findById(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (account.isVault) {
      const lockedResponse = await requireVaultUnlocked(request);
      if (lockedResponse) return lockedResponse;
    }

    const links = await SharedLinkModel.findBy({ accountId: id });
    
    // Filter out expired ones
    const activeLinks = links.filter((link) => !link.expiresAt || new Date() <= new Date(link.expiresAt));

    return NextResponse.json({ links: activeLinks });
  } catch (error) {
    console.error("GET /api/accounts/[id]/share error:", error);
    return NextResponse.json({ error: "Failed to retrieve shared links" }, { status: 500 });
  }
}

/**
 * DELETE /api/accounts/[id]/share?linkId=...
 * Revokes a shared link.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const linkId = request.nextUrl.searchParams.get("linkId");
    if (!linkId) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    const account = await AccountModel.findById(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (account.isVault) {
      const lockedResponse = await requireVaultUnlocked(request);
      if (lockedResponse) return lockedResponse;
    }

    const links = await SharedLinkModel.findBy({ accountId: id });
    const linkToDelete = links.find(l => l._id?.toString() === linkId);

    if (!linkToDelete) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    await SharedLinkModel.deleteOne(linkId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/accounts/[id]/share error:", error);
    return NextResponse.json({ error: "Failed to revoke shared link" }, { status: 500 });
  }
}
