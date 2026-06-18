"use client";

import { useState, useRef, useEffect } from "react";

export type StatusValue = "Active" | "Disable" | "Deleted";

interface StatusOption {
  value: StatusValue;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  icon: React.ReactNode;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "Active",
    label: "Active",
    description: "Account is in use",
    color: "#4ade80",
    bg: "rgba(74, 222, 128, 0.12)",
    border: "rgba(74, 222, 128, 0.3)",
    glow: "rgba(74, 222, 128, 0.2)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    value: "Disable",
    label: "Disable",
    description: "Temporarily inactive",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.12)",
    border: "rgba(251, 191, 36, 0.3)",
    glow: "rgba(251, 191, 36, 0.2)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="10" y1="15" x2="10" y2="9" />
        <line x1="14" y1="15" x2="14" y2="9" />
      </svg>
    ),
  },
  {
    value: "Deleted",
    label: "Deleted",
    description: "Account removed",
    color: "#f43f5e",
    bg: "rgba(244, 63, 94, 0.12)",
    border: "rgba(244, 63, 94, 0.3)",
    glow: "rgba(244, 63, 94, 0.2)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
];

export function getStatusOption(value: string): StatusOption {
  return (
    STATUS_OPTIONS.find((o) => o.value.toLowerCase() === value.toLowerCase()) ??
    STATUS_OPTIONS[0]
  );
}

interface StatusDropdownProps {
  value: StatusValue | string;
  onChange: (value: StatusValue) => void;
  readonly?: boolean;
}

export default function StatusDropdown({
  value,
  onChange,
  readonly = false,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const current = getStatusOption(value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  // Read-only pill (used in AccountDetail attribute table)
  if (readonly) {
    return (
      <span
        className="status-badge-inline"
        style={{
          color: current.color,
          background: current.bg,
          border: `1px solid ${current.border}`,
        }}
      >
        <span className="status-dot" style={{ background: current.color }} />
        {current.label}
      </span>
    );
  }

  return (
    /*
     * Inline wrapper — NOT position:absolute so it is never clipped
     * by the modal's overflow:hidden / overflow-y:auto. The panel
     * renders inside the normal document flow and the modal body
     * simply scrolls to show it.
     */
    <div ref={wrapperRef} className="status-dropdown-wrapper">
      {/* ── Trigger button ── */}
      <button
        type="button"
        id="status-dropdown-btn"
        className="status-dropdown-trigger"
        style={{
          color: current.color,
          background: current.bg,
          borderColor: open ? current.color : current.border,
          boxShadow: open ? `0 0 0 3px ${current.glow}` : undefined,
        }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={{ color: current.color, display: "flex" }}>{current.icon}</span>
        <span className="status-dot-pulse" style={{ background: current.color }} />
        <span className="status-trigger-label">{current.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            marginLeft: "auto",
            opacity: 0.7,
            transition: "transform 200ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Inline panel — stays in document flow, never clipped ── */}
      {open && (
        <div
          className="status-dropdown-panel"
          role="listbox"
          style={{ marginTop: "6px" }}
        >
          <div className="status-dropdown-header">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Select account status
          </div>

          {STATUS_OPTIONS.map((opt) => {
            const isSelected = opt.value === current.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`status-dropdown-option${isSelected ? " selected" : ""}`}
                style={
                  isSelected
                    ? { background: opt.bg, borderColor: opt.border }
                    : undefined
                }
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span
                  className="status-option-icon"
                  style={{ color: opt.color, background: opt.bg, borderColor: opt.border }}
                >
                  {opt.icon}
                </span>
                <span className="status-option-text">
                  <span
                    className="status-option-label"
                    style={{ color: isSelected ? opt.color : undefined }}
                  >
                    {opt.label}
                  </span>
                  <span className="status-option-desc">{opt.description}</span>
                </span>
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={opt.color}
                    strokeWidth="2.5"
                    style={{ marginLeft: "auto", flexShrink: 0 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
