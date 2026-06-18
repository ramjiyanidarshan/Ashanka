"use client";

import { useState, useEffect } from "react";
import type { Account } from "@/lib/types";
import StatusDropdown from "./StatusDropdown";
import type { StatusValue } from "./StatusDropdown";

interface AttributeRow {
  key: string;
  value: string;
}

interface AccountFormProps {
  initialData?: Account | null;
  initialProvider?: string;
  onSubmit: (
    serviceProvider: string,
    attributes: Record<string, string | null>
  ) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function AccountForm({
  initialData,
  initialProvider = "",
  onSubmit,
  onCancel,
  isLoading = false,
}: AccountFormProps) {
  const [serviceProvider, setServiceProvider] = useState(
    initialData?.serviceProvider ?? initialProvider
  );
  const [rows, setRows] = useState<AttributeRow[]>([]);
  const [status, setStatus] = useState<StatusValue>("Active");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData?.attributes) {
      // Extract Status separately; keep all other attrs as dynamic rows
      const statusVal =
        Object.entries(initialData.attributes).find(
          ([k]) => k.toLowerCase() === "status"
        )?.[1] ?? "Active";
      setStatus((statusVal as StatusValue) ?? "Active");

      setRows(
        Object.entries(initialData.attributes)
          .filter(([k]) => k.toLowerCase() !== "status")
          .map(([key, value]) => ({ key, value: value ?? "" }))
      );
    } else {
      // Default starter rows (no Status — it's the fixed field below)
      setRows([
        { key: "E-Mail", value: "" },
        { key: "Password", value: "" },
      ]);
    }
  }, [initialData]);

  function addRow() {
    setRows((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(
    index: number,
    field: "key" | "value",
    newValue: string
  ) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: newValue } : row
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!serviceProvider.trim()) {
      setError("Service provider name is required");
      return;
    }

    // Validate no duplicate keys
    const keys = rows.map((r) => r.key.trim()).filter(Boolean);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      setError("Duplicate attribute keys are not allowed");
      return;
    }

    // Build attributes: dynamic rows first, then fixed Status at the end
    const attributes: Record<string, string | null> = {};
    for (const row of rows) {
      const k = row.key.trim();
      if (!k) continue;
      attributes[k] = row.value.trim() === "" ? null : row.value.trim();
    }
    attributes["Status"] = status;

    await onSubmit(serviceProvider.trim(), attributes);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && <div className="login-error">{error}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="form-service-provider">
          Service Provider
        </label>
        <input
          id="form-service-provider"
          type="text"
          className="form-input"
          value={serviceProvider}
          onChange={(e) => setServiceProvider(e.target.value)}
          placeholder="e.g. GitHub, Gmail, Netflix..."
          required
        />
      </div>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <label className="form-label">Attributes</label>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={addRow}
            id="add-attribute-btn"
          >
            + Add Field
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {rows.map((row, idx) => (
            <div key={idx} className="attr-field-card">
              {/* Key — shown as a compact label at the top of the card */}
              <div className="attr-field-key-row">
                <input
                  type="text"
                  className="attr-field-key-input"
                  placeholder="Field name (e.g. E-Mail, Password)"
                  value={row.key}
                  onChange={(e) => updateRow(idx, "key", e.target.value)}
                  id={`attr-key-${idx}`}
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm btn-icon attr-field-remove"
                  onClick={() => removeRow(idx)}
                  title="Remove field"
                  id={`remove-attr-${idx}`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {/* Divider between key and value */}
              <div className="attr-field-divider" />
              {/* Value — main input */}
              <input
                type="text"
                className="attr-field-value-input form-input mono"
                placeholder="Value (leave empty for null)"
                value={row.value}
                onChange={(e) => updateRow(idx, "value", e.target.value)}
                id={`attr-value-${idx}`}
              />
            </div>
          ))}
        </div>

        {rows.length === 0 && (
          <div
            style={{
              padding: "1.5rem",
              textAlign: "center",
              color: "var(--text-muted)",
              border: "1px dashed var(--border-default)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8rem",
            }}
          >
            No attributes yet. Click &quot;+ Add Field&quot; to start.
          </div>
        )}

        {/* ── Fixed Status field ── */}
        <div className="attr-field-card status-field-card">
          <div className="attr-field-key-row">
            <span className="attr-field-key-input" style={{ cursor: "default" }}>
              Status
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--text-muted)",
                marginRight: "0.75rem",
                whiteSpace: "nowrap",
              }}
            >
              default field
            </span>
          </div>
          <div style={{ padding: "0.5rem 0.625rem 0.625rem" }}>
            <StatusDropdown value={status} onChange={setStatus} />
          </div>
        </div>
      </div>

      <div className="modal-footer" style={{ padding: 0 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
          id="form-cancel-btn"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
          id="form-submit-btn"
        >
          {isLoading ? (
            <>
              <svg
                className="spin"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Saving...
            </>
          ) : initialData ? (
            "Update Account"
          ) : (
            "Create Account"
          )}
        </button>
      </div>
    </form>
  );
}
