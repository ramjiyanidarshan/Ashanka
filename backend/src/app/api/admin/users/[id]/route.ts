import { NextRequest, NextResponse } from "next/server";
import { UserModel } from "@/lib/model";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get("x-auth-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const userId = id;
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const updates = await request.json();
    
    // Validate updates (only allow specific fields to be updated by admin)
    const allowedUpdates: any = {};
    if (updates.status && ["active", "suspended"].includes(updates.status)) {
      allowedUpdates.status = updates.status;
    }
    if (updates.features && typeof updates.features.vault === "boolean") {
      allowedUpdates.features = { vault: updates.features.vault };
    }
    
    // Prevent removing admin role of self or last admin if we wanted to,
    // but for now, just apply updates.
    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    const updatedUser = await UserModel.updateOne(userId, allowedUpdates);
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If a user is suspended, we might want to kill their active sessions,
    // but the proxy check `payload.status === 'suspended'` will only take effect on re-login
    // UNLESS we terminate their sessions or the proxy queries the DB.
    // Wait, proxy uses payload.status from the JWT.
    // So if we suspend them, their existing JWT still says "active".
    // We should terminate their sessions.
    if (allowedUpdates.status === "suspended") {
      const db = await getDb();
      await db.collection("sessions").updateMany(
        { userId: userId },
        { $set: { status: "terminated" } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin PUT /users/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
