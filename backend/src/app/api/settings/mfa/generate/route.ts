import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import { UserModel } from "@/lib/model";

export async function POST(request: NextRequest) {
  try {
    const username = request.headers.get("x-auth-username");
    if (!username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await UserModel.findOne({ username } as never);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(username, "Veshtit", secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Save secret but do NOT enable MFA yet
    user.mfaSecret = secret;
    user.mfaEnabled = false;
    await UserModel.updateOne(user._id!.toString(), { 
      mfaSecret: secret, 
      mfaEnabled: false 
    });

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataUrl,
      secret,
    });
  } catch (error) {
    console.error("Generate MFA error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
