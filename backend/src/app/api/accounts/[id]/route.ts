import { NextRequest, NextResponse } from "next/server";
import { AccountModel } from "@/lib/model";
import { encryptAttributes, decryptAttributes } from "@/lib/crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/accounts/[id]
 * Returns a single account with decrypted attributes.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const account = await AccountModel.findById(id);

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({
      account: {
        ...account,
        _id: account._id?.toString(),
        attributes: await decryptAttributes(account.attributes),
      },
    });
  } catch (error) {
    console.error("GET /api/accounts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounts/[id]
 * Updates an account (partial update of serviceProvider and/or attributes).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { serviceProvider, attributes } = body;

    const updateData: Record<string, unknown> = {};

    if (serviceProvider !== undefined) {
      if (typeof serviceProvider !== "string") {
        return NextResponse.json(
          { error: "serviceProvider must be a string" },
          { status: 400 }
        );
      }
      updateData.serviceProvider = serviceProvider;
    }

    if (attributes !== undefined) {
      if (typeof attributes !== "object") {
        return NextResponse.json(
          { error: "attributes must be an object" },
          { status: 400 }
        );
      }
      updateData.attributes = await encryptAttributes(attributes);
    }

    const updated = await AccountModel.updateOne(id, updateData as never);

    if (!updated) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({
      account: {
        ...updated,
        _id: updated._id?.toString(),
        attributes: await decryptAttributes(updated.attributes),
      },
    });
  } catch (error) {
    console.error("PUT /api/accounts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounts/[id]
 * Deletes an account by ID.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const deleted = await AccountModel.deleteOne(id);

    if (!deleted) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/accounts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
