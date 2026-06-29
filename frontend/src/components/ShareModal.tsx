"use client";

import { useState, useEffect } from "react";
import type { Account } from "@/lib/types";
import { accountsApi } from "@/lib/api";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account;
}

const EXPIRATION_OPTIONS = [
  { label: "1 Hour", value: 3600000 },
  { label: "24 Hours", value: 86400000 },
  { label: "7 Days", value: 604800000 },
  { label: "Forever", value: null },
];

export default function ShareModal({ isOpen, onClose, account }: ShareModalProps) {
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<number | null>(86400000); // Default 24h
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  
  // Active shares state
  const [activeShares, setActiveShares] = useState<any[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  const allAttributes = Object.keys(account.attributes);

  const fetchShares = async () => {
    try {
      setIsLoadingShares(true);
      const res = await accountsApi.getShares(account._id);
      setActiveShares(res.links || []);
    } catch (err) {
      console.error("Failed to fetch active shares", err);
    } finally {
      setIsLoadingShares(false);
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAttributes([...allAttributes]);
      setExpiresIn(86400000);
      setGeneratedLink(null);
      setError("");
      setCopied(false);
      fetchShares();
    }
  }, [isOpen, account]);

  if (!isOpen) return null;

  const handleToggleAttribute = (attr: string) => {
    setSelectedAttributes((prev) =>
      prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr]
    );
  };

  const handleGenerate = async () => {
    if (selectedAttributes.length === 0) {
      setError("Please select at least one attribute to share.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const data = await accountsApi.share(account._id, expiresIn, selectedAttributes);
      const link = `${window.location.origin}/share/${data.token}`;
      setGeneratedLink(link);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (linkToCopy?: string) => {
    const text = linkToCopy || generatedLink;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRevoke = async (linkId: string) => {
    try {
      await accountsApi.revokeShare(account._id, linkId);
      // Refresh list
      fetchShares();
      // If we just generated this link and revoked it, clear the generatedLink UI
      if (generatedLink && generatedLink.includes(activeShares.find(s => s._id === linkId)?.token)) {
        setGeneratedLink(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to revoke link.");
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500, width: "90%" }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Share Account: {account.serviceProvider}</h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Generate a magic link to securely share specific details of this account.
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close share modal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="login-error" style={{ marginBottom: "1rem" }}>{error}</div>}

          {/* Active Shares List */}
          {!generatedLink && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label className="form-label" style={{ marginBottom: "0.5rem", display: "block" }}>
                Active Links
              </label>
              {activeShares.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {activeShares.map(share => (
                  <div key={share._id} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    background: "rgba(0,0,0,0.15)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.8rem"
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", overflow: "hidden" }}>
                      <span style={{ color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        ...{share.token.slice(-8)}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                        {share.expiresAt ? `Expires: ${new Date(share.expiresAt).toLocaleString()}` : "Never expires"}
                        &nbsp;• {share.allowedAttributes.length} attr(s)
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleCopy(`${window.location.origin}/share/${share.token}`)}
                        title="Copy link"
                      >
                        Copy
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#f43f5e" }}
                        onClick={() => handleRevoke(share._id)}
                        title="Revoke link"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", padding: "0.5rem 0", fontStyle: "italic" }}>
                  No active link available.
                </div>
              )}
            </div>
          )}

          {generatedLink ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{
                padding: "1rem",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                wordBreak: "break-all",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                color: "var(--text-primary)"
              }}>
                {generatedLink}
              </div>
              <button
                className="btn btn-primary"
                onClick={() => handleCopy()}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                Anyone with this link will be able to view the selected attributes.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <hr style={{ borderTop: "1px solid var(--border-subtle)", margin: 0 }} />
              <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Create New Link</h3>
              
              {/* Expiration Settings */}
              <div>
                <label className="form-label" style={{ marginBottom: "0.5rem", display: "block" }}>
                  Expiration
                </label>
                <select
                  className="form-input"
                  value={expiresIn === null ? "null" : expiresIn.toString()}
                  onChange={(e) => setExpiresIn(e.target.value === "null" ? null : Number(e.target.value))}
                >
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value === null ? "null" : opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Attributes Selection */}
              <div>
                <label className="form-label" style={{ marginBottom: "0.5rem", display: "block" }}>
                  Attributes to Share
                </label>
                <div className="generator-checkbox-grid" style={{ gridTemplateColumns: "1fr", maxHeight: "250px", overflowY: "auto", margin: 0, paddingRight: "4px" }}>
                  {allAttributes.map((attr) => {
                    const isSelected = selectedAttributes.includes(attr);
                    return (
                      <button
                        type="button"
                        key={attr}
                        className={`generator-checkbox-card ${isSelected ? "active" : ""}`}
                        onClick={() => {
                          if (!isSelected) {
                            setSelectedAttributes([...selectedAttributes, attr]);
                          } else {
                            setSelectedAttributes(selectedAttributes.filter(a => a !== attr));
                          }
                        }}
                        style={{ padding: "0.6rem 0.8rem", gap: "0.6rem" }}
                      >
                        <div style={{
                          width: "18px", height: "18px", borderRadius: "4px",
                          border: `1.5px solid ${isSelected ? "var(--accent-primary)" : "var(--border-strong)"}`,
                          background: isSelected ? "var(--accent-primary)" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, transition: "all 0.15s ease"
                        }}>
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                        <div className="checkbox-card-content">
                          <span className="checkbox-card-title">{attr}</span>
                        </div>
                      </button>
                    );
                  })}
                  {allAttributes.length === 0 && (
                    <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>No attributes available.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {generatedLink ? (
            <button className="btn btn-secondary" onClick={onClose} style={{ width: "100%", justifyContent: "center" }}>
              Close
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose} disabled={isGenerating}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate Link"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
