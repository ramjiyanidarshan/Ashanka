import { NextRequest, NextResponse } from "next/server";
import { UserModel, SessionModel } from "@/lib/model";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get("x-auth-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await UserModel.findAll();
    
    // Scrub sensitive data before sending to admin
    const scrubbedUsers = users.map((u) => ({
      _id: u._id!.toString(),
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.status,
      features: u.features,
      createdAt: u.createdAt,
      mfaEnabled: u.mfaEnabled,
    }));

    return NextResponse.json({ users: scrubbedUsers });
  } catch (err) {
    console.error("Admin GET /users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
