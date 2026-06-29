import { NextRequest, NextResponse } from "next/server";
import { AuditLogModel } from "@/lib/model";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get("x-auth-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch last 100 global audit logs
    const db = await getDb();
    const logs = await db.collection("audit_logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    // The logs might contain sensitive details (like specific account names in "details" or "metadata").
    // We should sanitize them.
    const sanitizedLogs = logs.map((log: any) => {
      let sanitizedDetails = log.details;
      
      // Basic sanitization: if action is about a specific password/account, hide the name
      // e.g., "Deleted account 'Netflix'" -> "Deleted account '***'"
      if (typeof sanitizedDetails === "string" && sanitizedDetails.includes("account '")) {
        sanitizedDetails = sanitizedDetails.replace(/account '.*'/, "account '***'");
      }
      
      return {
        _id: log._id.toString(),
        userId: log.userId,
        action: log.action,
        details: sanitizedDetails,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress,
      };
    });

    return NextResponse.json({ logs: sanitizedLogs });
  } catch (err) {
    console.error("Admin GET /audit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
