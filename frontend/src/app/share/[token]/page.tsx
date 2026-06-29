"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import ProviderIcon from "@/components/ProviderIcon";
import { shareApi } from "@/lib/api";

interface SharedAccountData {
  serviceProvider: string;
  attributes: Record<string, string | null>;
  updatedAt: string;
  expiresAt: string | null;
}

const PASSWORD_KEYS = ["password", "passwd", "pass", "secret", "pin", "key"];

function isPasswordKey(key: string): boolean {
  return PASSWORD_KEYS.some((p) => key.toLowerCase().includes(p));
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy to clipboard"}
      style={{
        padding: "4px 8px",
        minHeight: "unset",
        color: copied ? "#10b981" : "currentColor",
        opacity: copied ? 1 : 0.6,
        transition: "all 0.2s ease",
        transform: copied ? "scale(1.05)" : "scale(1)",
        display: "flex",
        alignItems: "center",
        gap: "4px"
      }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700 }}>Copied!</span>
        </>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function AttributeValue({ attrKey, value }: { attrKey: string; value: string | null }) {
  const [revealed, setRevealed] = useState(false);
  const isPass = isPasswordKey(attrKey);

  if (value === null) {
    return <span className="attribute-value is-null">null</span>;
  }

  if (isPass) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <span
          className={`attribute-value is-password font-mono`}
          style={{ letterSpacing: revealed ? "normal" : "0.2em" }}
          title={revealed ? value : "Click to reveal"}
        >
          {revealed ? value : "••••••••••••"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setRevealed((r) => !r)}
            title={revealed ? "Hide" : "Reveal"}
            style={{ padding: "4px 8px", minHeight: "unset", opacity: 0.6 }}
          >
            {revealed ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
          <CopyButton value={value} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <span className="attribute-value font-mono">{value}</span>
      <CopyButton value={value} />
    </div>
  );
}

export default function SharedAccountPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const { token } = resolvedParams;
  const [data, setData] = useState<SharedAccountData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await shareApi.get(token);
        setData(result);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ color: "var(--text-secondary)" }}>Loading shared account...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
        padding: "1rem"
      }}>
        {/* Ambient background */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80vw",
          height: "80vw",
          maxWidth: "800px",
          maxHeight: "800px",
          background: "var(--accent-primary)",
          opacity: 0.05,
          filter: "blur(120px)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0
        }} />

        <div style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: "460px",
          textAlign: "center"
        }}>
          {/* Branding Header */}
          <div style={{ marginBottom: "2rem", animation: "fadeIn 0.5s ease-out" }}>
            <h1 style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              marginBottom: "0.25rem",
              fontFamily: "Rozha One"
            }}>
              अशङ्क
            </h1>
          </div>

          <div className="account-card" style={{
            width: "100%",
            cursor: "default",
            boxShadow: "0 24px 50px rgba(0,0,0,0.15), 0 0 0 1px var(--border-subtle)",
            padding: "3rem 2rem",
            borderRadius: "var(--radius-xl)",
            animation: "slideUp 0.5s ease-out",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "var(--bg-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
              boxShadow: "inset 0 1px 2px rgba(255,255,255,0.05)"
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
              Link Unavailable
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: "80%" }}>
              This secure sharing link has expired or been revoked by the owner. Please request a new link to access these details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "var(--bg-primary)",
      position: "relative",
      overflow: "hidden",
      padding: "1rem"
    }}>
      {/* Premium Decorative Background Blobs */}
      <div style={{
        position: "absolute",
        top: "-15%",
        left: "-10%",
        width: "60vw",
        height: "60vw",
        maxWidth: "600px",
        maxHeight: "600px",
        background: "var(--gradient-brand)",
        opacity: 0.15,
        filter: "blur(100px)",
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        bottom: "-15%",
        right: "-10%",
        width: "60vw",
        height: "60vw",
        maxWidth: "600px",
        maxHeight: "600px",
        background: "var(--accent-primary)",
        opacity: 0.1,
        filter: "blur(100px)",
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 0
      }} />

      <div style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "560px"
      }}>
        {/* Branding Header */}
        <div style={{ marginBottom: "2rem", textAlign: "center", animation: "fadeIn 0.5s ease-out" }}>
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: 800,
            background: "var(--gradient-brand)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
            marginBottom: "0.25rem",
            fontFamily: "Rozha One"
          }}>
            अशङ्क
          </h1>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontWeight: 600
          }}>
            Secure Data Vault
          </p>
        </div>

        <div className="account-card" style={{
          width: "100%",
          cursor: "default",
          boxShadow: "0 24px 50px rgba(0,0,0,0.25), 0 0 0 1px var(--border-subtle)",
          padding: "2rem",
          borderRadius: "var(--radius-xl)",
          animation: "slideUp 0.5s ease-out"
        }}>

          <div className="account-card-header" style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                padding: "0.5rem",
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.05)"
              }}>
                <ProviderIcon name={data.serviceProvider} size={48} />
              </div>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                  {data.serviceProvider}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--accent-primary-light)", marginTop: "0.125rem", fontWeight: 500 }}>
                  Shared Account Secure View
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
            {Object.entries(data.attributes).length > 0 ? (
              Object.entries(data.attributes).map(([key, value]) => (
                <div key={key} style={{ display: "flex", flexDirection: "column" }}>
                  <div className="attribute-row" style={{ padding: "0.75rem 0" }}>
                    <span className="attribute-key" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{key}</span>
                    <AttributeValue attrKey={key} value={value} />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "2rem 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                No attributes shared.
              </div>
            )}
          </div>

          {data.expiresAt && (
            <div style={{
              marginTop: "0.5rem",
              padding: "1rem",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Access expires:
              </span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {new Date(data.expiresAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div style={{ marginTop: "2.5rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", opacity: 0.8 }}>
          Securely shared via <Link href="/" style={{ color: "var(--text-secondary)", fontWeight: 600, textDecoration: "none", fontFamily: "Rozha One" }}>अशङ्क</Link>
        </div>
      </div>
    </div>
  );
}
