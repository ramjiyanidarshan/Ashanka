import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { UserModel } from "@/lib/model";

/**
 * GET /api/seed
 * Seeds the database with the admin user from environment variables.
 * Safe to call multiple times — will not create duplicate users.
 * Should be called once on first boot.
 */
export async function GET() {
  try {
    const username = process.env.APP_USERNAME;
    const password = process.env.APP_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        { error: "APP_USERNAME and APP_PASSWORD must be set in environment" },
        { status: 500 }
      );
    }

    // Check if user already exists
    const existing = await UserModel.findOne({ username } as never);
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Admin user already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await UserModel.insertOne({ username, passwordHash } as never);

    return NextResponse.json({
      success: true,
      message: "Admin user seeded successfully",
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    );
  }
}
