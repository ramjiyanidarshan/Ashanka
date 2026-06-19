import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { UserModel } from "@/lib/model";

export async function POST(request: NextRequest) {
  try {
    const username = request.headers.get("x-auth-username");
    if (!username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const user = await UserModel.findOne({ username } as never);
    if (!user || !user.mfaSecret) {
      return NextResponse.json({ error: "MFA setup not initiated" }, { status: 400 });
    }

    const isValid = authenticator.check(code, user.mfaSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 });
    }

    user.mfaEnabled = true;
    await UserModel.updateOne(user._id!.toString(), { mfaEnabled: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Enable MFA error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
