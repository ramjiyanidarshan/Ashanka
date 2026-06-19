import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { UserModel } from "@/lib/model";

export async function POST(request: NextRequest) {
  try {
    const username = request.headers.get("x-auth-username");
    if (!username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const user = await UserModel.findOne({ username } as never);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    user.mfaEnabled = false;
    user.mfaSecret = "";
    await UserModel.updateOne(user._id!.toString(), { 
      mfaEnabled: false, 
      mfaSecret: "" 
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disable MFA error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
