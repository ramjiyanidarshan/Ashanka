import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { UserModel, AccountModel, SharedLinkModel, AuditLogModel } from "@/lib/model";
import { SessionModel } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get("x-auth-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [totalUsers, activeUsers, totalAccounts, totalLinks, totalAuditLogs, activeSessions] = await Promise.all([
      UserModel.count(),
      UserModel.count({ status: "active" } as never),
      AccountModel.count(),
      SharedLinkModel.count(),
      AuditLogModel.count(),
      SessionModel.count({ status: "active" } as never)
    ]);

    return NextResponse.json({
      metrics: {
        totalUsers,
        activeUsers,
        totalAccounts,
        totalLinks,
        totalAuditLogs,
        activeSessions
      }
    });
  } catch (err) {
    console.error("Admin GET /metrics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
