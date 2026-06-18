"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import crypto from "crypto";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

interface Settings {
  security: { username: string };
  encryption: { keyMasked: string; algorithm: string };
  jwt: { secretMasked: string };
  database: { uriMasked: string; status: "connected" | "error"; latencyMs: number | null };
  policy: { passwordRotationDays: number };
}

type SectionKey = "security" | "encryption" | "jwt" | "database" | "appearance" | "data";

type Msg = { type: "success" | "error" | "warning"; text: string } | null;

function Alert({ msg }: { msg: Msg }) {
  if (!msg) return null;
  const colors = {
    success: { bg: "rgba(74,222,128,0.1)", color: "#4ade80", border: "rgba(74,222,128,0.25)" },
    error:   { bg: "rgba(244,63,94,0.1)",  color: "#f43f5e", border: "rgba(244,63,94,0.25)"  },
    warning: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  }[msg.type];
  const Icon = msg.type === "success"
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    : msg.type === "warning"
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
  return (
    <div className="settings-alert" style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`, marginBottom: "1rem" }}>
      {Icon} {msg.text}
    </div>
  );
}

function Spinner() {
  return <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey>("security");

  // ── Change password ────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: "", newPwd: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  // ── Policy ─────────────────────────────────────────────────────────────────
  const [rotationDays, setRotationDays] = useState(90);
  const [rotationLoading, setRotationLoading] = useState(false);
  const [rotationMsg, setRotationMsg] = useState<Msg>(null);

  // ── AES Key ────────────────────────────────────────────────────────────────
  const [aesKey, setAesKey] = useState("");
  const [aesLoading, setAesLoading] = useState(false);
  const [aesMsg, setAesMsg] = useState<Msg>(null);
  const [aesConfirmOpen, setAesConfirmOpen] = useState(false);
  const [aesProgress, setAesProgress] = useState<{ done: number; total: number; log: string[] } | null>(null);

  // ── JWT Secret ────────────────────────────────────────────────────────────
  const [jwtSecret, setJwtSecret] = useState("");
  const [jwtLoading, setJwtLoading] = useState(false);
  const [jwtMsg, setJwtMsg] = useState<Msg>(null);
  const [jwtConfirmOpen, setJwtConfirmOpen] = useState(false);

  // ── DB test ────────────────────────────────────────────────────────────────
  const [dbTesting, setDbTesting] = useState(false);
  const [dbResult, setDbResult] = useState<{ status: string; latencyMs?: number; error?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/settings`, { credentials: "include" });
      if (res.status === 401) { router.push("/login"); return; }
      setSettings(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (settings?.policy) setRotationDays(settings.policy.passwordRotationDays); }, [settings]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function generateHex(bytes: number) {
    const arr = new Uint8Array(bytes);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function callSettings(body: object): Promise<{ ok: boolean; data: { message?: string; error?: string } }> {
    const res = await fetch(`${BACKEND}/api/settings`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, data: await res.json() };
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true); setPwMsg(null);
    try {
      const { ok, data } = await callSettings({ action: "changePassword", currentPassword: pwForm.current, newPassword: pwForm.newPwd, confirmPassword: pwForm.confirm });
      setPwMsg({ type: ok ? "success" : "error", text: (ok ? data.message : data.error) ?? "Error" });
      if (ok) setPwForm({ current: "", newPwd: "", confirm: "" });
    } catch { setPwMsg({ type: "error", text: "Network error" }); }
    finally { setPwLoading(false); }
  }

  async function handleUpdateRotationPolicy(e: React.FormEvent) {
    e.preventDefault();
    setRotationLoading(true); setRotationMsg(null);
    try {
      const { ok, data } = await callSettings({ action: "updatePasswordPolicy", passwordRotationDays: rotationDays });
      setRotationMsg({ type: ok ? "success" : "error", text: (ok ? data.message : data.error) ?? "Error" });
      if (ok) load();
    } catch { setRotationMsg({ type: "error", text: "Network error" }); }
    finally { setRotationLoading(false); }
  }

  async function handleUpdateAesKey() {
    setAesConfirmOpen(false);
    setAesLoading(true);
    setAesMsg(null);
    setAesProgress({ done: 0, total: 0, log: [] });
    try {
      const res = await fetch(`${BACKEND}/api/settings/rotate-key`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newKey: aesKey }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setAesMsg({ type: "error", text: err.error ?? "Failed to rotate key" });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.replace(/^data:\s*/, "");
          if (!line) continue;
          try {
            const msg = JSON.parse(line) as {
              type: string; total?: number; done?: number; reEncrypted?: number; message?: string;
            };
            if (msg.type === "start") {
              setAesProgress({ done: 0, total: msg.total ?? 0, log: [`Starting re-encryption of ${msg.total} accounts…`] });
            } else if (msg.type === "progress") {
              setAesProgress((prev) => ({
                done: msg.done ?? 0,
                total: msg.total ?? prev?.total ?? 0,
                log: prev ? [...prev.log, `Re-encrypted ${msg.done}/${msg.total}`] : [],
              }));
            } else if (msg.type === "done") {
              setAesProgress((prev) => ({
                done: msg.reEncrypted ?? prev?.total ?? 0,
                total: prev?.total ?? 0,
                log: prev ? [...prev.log, `✓ Done — ${msg.reEncrypted} accounts re-encrypted`] : [],
              }));
              setAesMsg({ type: "success", text: `Key rotated successfully. ${msg.reEncrypted} accounts re-encrypted.` });
              setAesKey("");
              load();
            } else if (msg.type === "error") {
              setAesMsg({ type: "error", text: msg.message ?? "Unknown error during rotation" });
            }
          } catch { /* malformed event */ }
        }
      }
    } catch {
      setAesMsg({ type: "error", text: "Network error during key rotation" });
    } finally {
      setAesLoading(false);
    }
  }

  async function handleUpdateJwtSecret() {
    setJwtConfirmOpen(false);
    setJwtLoading(true); setJwtMsg(null);
    try {
      const { ok, data } = await callSettings({ action: "updateJwtSecret", newSecret: jwtSecret });
      setJwtMsg({ type: ok ? "success" : "error", text: (ok ? data.message : data.error) ?? "Error" });
      if (ok) { setJwtSecret(""); load(); setTimeout(() => router.push("/login"), 2000); }
    } catch { setJwtMsg({ type: "error", text: "Network error" }); }
    finally { setJwtLoading(false); }
  }

  async function handleTestDb() {
    setDbTesting(true); setDbResult(null);
    try {
      const { data } = await callSettings({ action: "testDb" });
      setDbResult(data as { status: string; latencyMs?: number; error?: string });
    } catch { setDbResult({ status: "error", error: "Network error" }); }
    finally { setDbTesting(false); }
  }

  const navItems: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
    { key: "security",   label: "Security",   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
    { key: "encryption", label: "Encryption", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
    { key: "jwt",        label: "JWT",        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> },
    { key: "database",   label: "Database",   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
    { key: "appearance", label: "Appearance", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
    { key: "data",       label: "Data",       icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> },
  ];

  return (
    <AppShell>
      <div className="settings-page">
        <div className="settings-header">
          <div>
            <h1 className="dashboard-title">Settings</h1>
            <p className="dashboard-subtitle">Manage your Veshtit configuration</p>
          </div>
        </div>

        <div className="settings-layout">
          <nav className="settings-nav">
            {navItems.map((item) => (
              <button key={item.key} className={`settings-nav-item${activeSection === item.key ? " active" : ""}`} onClick={() => setActiveSection(item.key)}>
                <span className="settings-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="settings-content">
            {loading ? (
              <div className="empty-state"><Spinner /></div>
            ) : (
              <>
                {/* ── Security ────────────────────────────────────────────── */}
                {activeSection === "security" && (
                  <div className="settings-section">
                    <div className="settings-section-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Security
                    </div>
                    <div className="settings-info-row">
                      <span className="settings-info-label">Admin username</span>
                      <code className="settings-info-value">{settings?.security.username}</code>
                    </div>
                    <div className="settings-divider" />
                    <p className="settings-desc">Change your admin password. This is stored in the server <code>.env</code> file.</p>
                    <Alert msg={pwMsg} />
                    <form className="settings-form" onSubmit={handleChangePassword}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="current-pwd">Current Password</label>
                        <input id="current-pwd" type="password" className="form-input" value={pwForm.current}
                          onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} placeholder="Enter current password" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="new-pwd">New Password</label>
                        <input id="new-pwd" type="password" className="form-input" value={pwForm.newPwd}
                          onChange={(e) => setPwForm((f) => ({ ...f, newPwd: e.target.value }))} placeholder="At least 8 characters" required minLength={8} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="confirm-pwd">Confirm Password</label>
                        <input id="confirm-pwd" type="password" className="form-input" value={pwForm.confirm}
                          onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password" required />
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={pwLoading} id="save-password-btn">
                        {pwLoading ? <Spinner /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
                        Save Password
                      </button>
                    </form>

                    <div className="settings-divider" />
                    
                    <div className="settings-section-title" style={{ marginTop: "1rem" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22v-7l-3-3"/><path d="M12 15l3-3"/><circle cx="12" cy="12" r="10"/></svg>
                      Security Policy
                    </div>
                    <p className="settings-desc">Set how often you should be reminded to rotate your account passwords. This helps maintain a high security score.</p>
                    <Alert msg={rotationMsg} />
                    <form className="settings-form" onSubmit={handleUpdateRotationPolicy}>
                      <div className="form-group" style={{ maxWidth: "240px" }}>
                        <label className="form-label" htmlFor="rotation-days">Password Rotation Age (Days)</label>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <input id="rotation-days" type="number" min="1" className="form-input" value={rotationDays}
                            onChange={(e) => setRotationDays(parseInt(e.target.value) || 90)} required />
                          <button type="submit" className="btn btn-secondary" disabled={rotationLoading}>
                            {rotationLoading ? <Spinner /> : "Save"}
                          </button>
                        </div>
                      </div>
                    </form>

                  </div>
                )}

                {/* ── AES Encryption Key ──────────────────────────────────── */}
                {activeSection === "encryption" && (
                  <div className="settings-section">
                    <div className="settings-section-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      AES-256-GCM Encryption Key
                    </div>

                    <div className="settings-encryption-badge">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>AES-256-GCM</p>
                        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Stored in MongoDB · Military-grade</p>
                      </div>
                      <span className="status-badge-inline" style={{ color:"#4ade80",background:"rgba(74,222,128,0.12)",border:"1px solid rgba(74,222,128,0.3)",marginLeft:"auto" }}>
                        <span className="status-dot" style={{ background:"#4ade80" }}/>Active
                      </span>
                    </div>

                    <div className="settings-info-row">
                      <span className="settings-info-label">Algorithm</span>
                      <code className="settings-info-value">AES-256-GCM</code>
                    </div>
                    <div className="settings-info-row">
                      <span className="settings-info-label">Current Key</span>
                      <code className="settings-info-value mono">{settings?.encryption.keyMasked}</code>
                    </div>

                    <div className="settings-divider" />

                    <div className="settings-alert" style={{ background:"rgba(251,191,36,0.08)",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.25)",marginBottom:"1rem",alignItems:"flex-start" }}>
                      <svg style={{flexShrink:0,marginTop:"1px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <span>Rotating the key will <strong>re-encrypt all account data</strong> automatically. This cannot be undone. Keep your new key safe.</span>
                    </div>

                    <Alert msg={aesMsg} />

                    <div className="key-input-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="aes-key-input">New AES Key <span style={{ color:"var(--text-muted)",fontWeight:400 }}>(64 hex chars · 32 bytes)</span></label>
                        <input
                          id="aes-key-input"
                          className="form-input mono"
                          value={aesKey}
                          onChange={(e) => setAesKey(e.target.value.toLowerCase())}
                          placeholder="Enter or generate a 64-character hex key"
                          maxLength={64}
                          spellCheck={false}
                        />
                        <div className="key-char-count" style={{ color: aesKey.length === 64 ? "#4ade80" : "var(--text-muted)" }}>
                          {aesKey.length}/64 characters
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary key-generate-btn"
                        onClick={() => setAesKey(generateHex(32))}
                        title="Generate a cryptographically random key"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.93"/></svg>
                        Generate
                      </button>
                    </div>

                    {/* Confirm dialog / Progress UI */}
                    {aesLoading && aesProgress ? (
                      <div className="rotation-progress-box">
                        <div className="rotation-progress-header">
                          <Spinner />
                          <span>Re-encrypting accounts… {aesProgress.done}/{aesProgress.total}</span>
                        </div>
                        <div className="rotation-progress-track">
                          <div
                            className="rotation-progress-fill"
                            style={{ width: aesProgress.total > 0 ? `${Math.round((aesProgress.done / aesProgress.total) * 100)}%` : "0%" }}
                          />
                        </div>
                        <div className="rotation-progress-pct">
                          {aesProgress.total > 0 ? `${Math.round((aesProgress.done / aesProgress.total) * 100)}%` : "Starting…"}
                        </div>
                      </div>
                    ) : aesConfirmOpen ? (
                      <div className="confirm-box">
                        <p className="confirm-box-title">
                          <svg style={{flexShrink:0}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          <span>Are you sure? All accounts will be re-encrypted with the new key.</span>
                        </p>
                        <div className="confirm-box-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => setAesConfirmOpen(false)}>Cancel</button>
                          <button className="btn btn-danger btn-sm" onClick={handleUpdateAesKey} disabled={aesLoading}>
                            Yes, rotate key
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        id="update-aes-btn"
                        className="btn btn-primary"
                        disabled={aesKey.length !== 64 || !/^[0-9a-f]+$/i.test(aesKey) || aesLoading}
                        onClick={() => setAesConfirmOpen(true)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Update Encryption Key
                      </button>
                    )}
                  </div>
                )}

                {/* ── JWT Secret ──────────────────────────────────────────── */}
                {activeSection === "jwt" && (
                  <div className="settings-section">
                    <div className="settings-section-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                      JWT Session Secret
                    </div>

                    <div className="settings-info-row">
                      <span className="settings-info-label">Current Secret</span>
                      <code className="settings-info-value mono">{settings?.jwt?.secretMasked ?? "••••••••"}</code>
                    </div>
                    <div className="settings-info-row">
                      <span className="settings-info-label">Storage</span>
                      <code className="settings-info-value">MongoDB · settings collection</code>
                    </div>

                    <div className="settings-divider" />

                    <div className="settings-alert" style={{ background:"rgba(244,63,94,0.08)",color:"#f43f5e",border:"1px solid rgba(244,63,94,0.25)",marginBottom:"1rem",alignItems:"flex-start" }}>
                      <svg style={{flexShrink:0,marginTop:"1px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span>Rotating the JWT secret <strong>immediately invalidates all active sessions</strong>. Every user will be logged out and must sign in again.</span>
                    </div>

                    <Alert msg={jwtMsg} />

                    <div className="key-input-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label" htmlFor="jwt-secret-input">New JWT Secret <span style={{ color:"var(--text-muted)",fontWeight:400 }}>(min. 32 characters)</span></label>
                        <input
                          id="jwt-secret-input"
                          className="form-input mono"
                          value={jwtSecret}
                          onChange={(e) => setJwtSecret(e.target.value)}
                          placeholder="Enter or generate a random secret"
                          spellCheck={false}
                        />
                        <div className="key-char-count" style={{ color: jwtSecret.length >= 32 ? "#4ade80" : "var(--text-muted)" }}>
                          {jwtSecret.length} characters {jwtSecret.length >= 32 ? "✓" : `(need ${32 - jwtSecret.length} more)`}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary key-generate-btn"
                        onClick={() => setJwtSecret(generateHex(32))}
                        title="Generate a cryptographically random secret"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.93"/></svg>
                        Generate
                      </button>
                    </div>

                    {jwtConfirmOpen ? (
                      <div className="confirm-box confirm-box-danger">
                        <p className="confirm-box-title">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          This will log out all users immediately. Continue?
                        </p>
                        <div className="confirm-box-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => setJwtConfirmOpen(false)}>Cancel</button>
                          <button className="btn btn-danger btn-sm" onClick={handleUpdateJwtSecret} disabled={jwtLoading}>
                            {jwtLoading ? <Spinner /> : null} Yes, rotate secret
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        id="update-jwt-btn"
                        className="btn btn-primary"
                        disabled={jwtSecret.length < 32 || jwtLoading}
                        onClick={() => setJwtConfirmOpen(true)}
                      >
                        {jwtLoading ? <Spinner /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.93"/></svg>}
                        Rotate JWT Secret
                      </button>
                    )}
                  </div>
                )}

                {/* ── Database ────────────────────────────────────────────── */}
                {activeSection === "database" && (
                  <div className="settings-section">
                    <div className="settings-section-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                      Database
                    </div>
                    <div className="settings-info-row">
                      <span className="settings-info-label">Connection URI</span>
                      <code className="settings-info-value mono">{settings?.database.uriMasked}</code>
                    </div>
                    <div className="settings-info-row">
                      <span className="settings-info-label">Status</span>
                      {settings?.database.status === "connected"
                        ? <span className="status-badge-inline" style={{ color:"#4ade80",background:"rgba(74,222,128,0.12)",border:"1px solid rgba(74,222,128,0.3)" }}><span className="status-dot" style={{ background:"#4ade80" }}/>Connected {settings.database.latencyMs != null ? `· ${settings.database.latencyMs}ms` : ""}</span>
                        : <span className="status-badge-inline" style={{ color:"#f43f5e",background:"rgba(244,63,94,0.12)",border:"1px solid rgba(244,63,94,0.3)" }}><span className="status-dot" style={{ background:"#f43f5e" }}/>Disconnected</span>
                      }
                    </div>
                    <div className="settings-divider" />
                    {dbResult && (
                      <div className="settings-alert" style={dbResult.status==="connected" ? { background:"rgba(74,222,128,0.1)",color:"#4ade80",border:"1px solid rgba(74,222,128,0.25)" } : { background:"rgba(244,63,94,0.1)",color:"#f43f5e",border:"1px solid rgba(244,63,94,0.25)" }}>
                        {dbResult.status === "connected"
                          ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Connected in {dbResult.latencyMs}ms</>
                          : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> {dbResult.error}</>
                        }
                      </div>
                    )}
                    <button id="test-db-btn" className="btn btn-secondary" onClick={handleTestDb} disabled={dbTesting}>
                      {dbTesting ? <Spinner /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>}
                      Test Connection
                    </button>
                    <div className="settings-alert settings-alert-info" style={{ marginTop:"1rem" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      To change the MongoDB URI, update <code>MONGODB_URI</code> in the backend <code>.env</code> and restart the server.
                    </div>
                  </div>
                )}

                {/* ── Appearance ──────────────────────────────────────────── */}
                {activeSection === "appearance" && (
                  <div className="settings-section">
                    <div className="settings-section-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                      Appearance
                    </div>
                    <p className="settings-desc">Choose your preferred theme. Saved locally in your browser.</p>
                    <div className="theme-picker-grid">
                      {(["dark", "light"] as const).map((t) => (
                        <button key={t} className="theme-picker-btn"
                          onClick={() => { document.documentElement.setAttribute("data-theme", t === "light" ? "light" : ""); localStorage.setItem("veshtit-theme", t); }}>
                          <div className={`theme-preview theme-preview-${t}`}>
                            <div className="theme-preview-bar" />
                            <div className="theme-preview-lines"><div /><div /><div /></div>
                          </div>
                          <span className="theme-picker-label">{t === "dark" ? "🌙 Dark" : "☀️ Light"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Data ────────────────────────────────────────────────── */}
                {activeSection === "data" && (
                  <div className="settings-section">
                    <div className="settings-section-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                      Data Management
                    </div>
                    <p className="settings-desc">Export or import all your accounts as a JSON file.</p>
                    <div className="settings-data-actions">
                      <div className="settings-data-card">
                        <div className="settings-data-icon" style={{ color:"var(--accent-primary)",background:"var(--accent-primary-dim)" }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </div>
                        <div>
                          <p style={{ fontWeight:600,marginBottom:"0.25rem" }}>Export Accounts</p>
                          <p style={{ fontSize:"0.8rem",color:"var(--text-muted)" }}>Download all accounts as decrypted JSON</p>
                        </div>
                        <button id="export-data-btn" className="btn btn-secondary" style={{ marginLeft:"auto" }}
                          onClick={async () => { const res = await fetch(`${BACKEND}/api/export`,{credentials:"include"}); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="veshtit-export.json"; a.click(); URL.revokeObjectURL(url); }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Export
                        </button>
                      </div>
                      <div className="settings-data-card">
                        <div className="settings-data-icon" style={{ color:"var(--accent-secondary)",background:"var(--accent-secondary-dim)" }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </div>
                        <div>
                          <p style={{ fontWeight:600,marginBottom:"0.25rem" }}>Import Accounts</p>
                          <p style={{ fontSize:"0.8rem",color:"var(--text-muted)" }}>Import accounts from a JSON file</p>
                        </div>
                        <button id="import-data-btn" className="btn btn-secondary" style={{ marginLeft:"auto" }} onClick={() => router.push("/accounts")}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          Go to Import
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
