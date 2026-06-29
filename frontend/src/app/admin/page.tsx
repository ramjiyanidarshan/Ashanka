"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, adminApi } from "@/lib/api";
import AppShell from "@/components/AppShell";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "audit">("overview");
  
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    authApi.verify().then((res) => {
      if (!res.authenticated || res.role !== "admin") {
        router.replace("/dashboard");
      } else {
        loadData();
      }
    }).catch(() => router.replace("/login"));
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, auditRes, metricsRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getAuditLogs(),
        adminApi.getMetrics(),
      ]);
      setUsers(usersRes.users || []);
      setAuditLogs(auditRes.logs || []);
      setMetrics(metricsRes.metrics || null);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function toggleUserStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await adminApi.updateUser(userId, { status: newStatus });
      setUsers(users.map((u) => (u._id === userId ? { ...u, status: newStatus } : u)));
      showToast(`User status updated to ${newStatus}`, "success");
    } catch (err) {
      showToast("Failed to update status", "error");
    }
  }

  async function toggleVaultFeature(userId: string, currentVault: boolean) {
    try {
      await adminApi.updateUser(userId, { features: { vault: !currentVault } });
      setUsers(users.map((u) => (u._id === userId ? { ...u, features: { ...u.features, vault: !currentVault } } : u)));
      showToast(`Sanduk feature ${!currentVault ? "enabled" : "disabled"} for user`, "success");
    } catch (err) {
      showToast("Failed to update feature", "error");
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="main-panel" style={{ flex: 1, display: "flex", justifyContent: "center", paddingTop: "4rem" }}>
          <svg className="spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: toast.type === "success" ? "var(--bg-glass)" : "var(--accent-danger-dim)",
          border: `1px solid ${toast.type === "success" ? "var(--border-strong)" : "var(--accent-danger)"}`,
          color: toast.type === "success" ? "var(--text-primary)" : "var(--text-primary)",
          backdropFilter: "blur(12px)",
          padding: "1rem 1.5rem",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontWeight: 600,
          animation: "slideIn 0.3s ease-out"
        }}>
          {toast.type === "success" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-danger)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          )}
          {toast.message}
        </div>
      )}

      <div className="main-panel font-sans" style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        <header className="page-header" style={{ marginBottom: "2rem" }}>
          <h1 className="page-title">Admin Panel</h1>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Platform Management & Audit
          </div>
        </header>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--border-default)" }}>
          <button
            className={`btn ${activeTab === "overview" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("overview")}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          >
            Overview
          </button>
          <button
            className={`btn ${activeTab === "users" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("users")}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          >
            User Management
          </button>
          <button
            className={`btn ${activeTab === "audit" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("audit")}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          >
            Audit Logs
          </button>
        </div>

        {activeTab === "overview" && metrics && (
          <div className="admin-dashboard-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Users</span>
              <span className="admin-stat-value">{metrics.totalUsers}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Active Users</span>
              <span className="admin-stat-value">{metrics.activeUsers}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Stored Accounts</span>
              <span className="admin-stat-value">{metrics.totalAccounts}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Active Sessions</span>
              <span className="admin-stat-value">{metrics.activeSessions}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Shared Links</span>
              <span className="admin-stat-value">{metrics.totalLinks}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Audit Events</span>
              <span className="admin-stat-value">{metrics.totalAuditLogs}</span>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>MFA</th>
                  <th>Sanduk Feature</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                    <td>
                      <span className={`badge badge-${u.role || "enduser"}`}>
                        {u.role || "enduser"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${u.status || "active"}`}>
                        {u.status || "active"}
                      </span>
                    </td>
                    <td>
                      {u.mfaEnabled ? (
                        <span style={{ color: "var(--accent-success)", fontWeight: 600 }}>Enabled</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>Disabled</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.features?.vault ? "btn-secondary" : "btn-ghost"}`}
                        onClick={() => toggleVaultFeature(u._id, u.features?.vault)}
                        disabled={u.role === "admin"}
                      >
                        {u.features?.vault ? "Disable Sanduk" : "Enable Sanduk"}
                      </button>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.status === "suspended" ? "btn-primary" : "btn-danger"}`}
                        onClick={() => toggleUserStatus(u._id, u.status || "active")}
                        disabled={u.role === "admin"}
                      >
                        {u.status === "suspended" ? "Activate User" : "Suspend User"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User ID</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {log.userId.slice(-6)}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--accent-primary-light)" }}>
                      {log.action}
                    </td>
                    <td>{log.details}</td>
                    <td style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
