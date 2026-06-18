"use client";

import { useState } from "react";
import type { GroupedAccounts } from "@/lib/types";

interface ProviderListProps {
  grouped: GroupedAccounts;
  selectedProvider: string | null;
  onSelect: (provider: string) => void;
  onAddNew: () => void;
  isMobileOpen: boolean;
  onClose: () => void;
}

export default function ProviderList({
  grouped,
  selectedProvider,
  onSelect,
  onAddNew,
  isMobileOpen,
  onClose,
}: ProviderListProps) {
  const [search, setSearch] = useState("");

  const providers = Object.keys(grouped).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  const filtered = providers.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase())
  );

  function getProviderInitial(name: string) {
    return name.charAt(0).toUpperCase();
  }

  function getAccountCount(provider: string) {
    return grouped[provider]?.length ?? 0;
  }

  function handleSelect(provider: string) {
    onSelect(provider);
    onClose(); // auto-close drawer on mobile after selection
  }

  return (
    <>
      {/* Dim overlay — mobile only, shown when drawer is open */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-label="Close menu"
        />
      )}

      <div className={`sidebar${isMobileOpen ? " mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span className="sidebar-title">
              Providers ({providers.length})
            </span>
            <button
              id="add-provider-btn"
              className="btn btn-primary btn-sm"
              onClick={onAddNew}
              title="Add new account"
            >
              + New
            </button>
          </div>

          <div className="search-wrapper">
            <span className="search-icon">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              id="provider-search"
              type="search"
              className="form-input search-input"
              placeholder="Search providers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="sidebar-list">
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "2rem 1rem",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
              }}
            >
              {search ? "No providers match your search" : "No providers yet"}
            </div>
          ) : (
            filtered.map((provider) => (
              <div
                key={provider}
                id={`provider-${provider.replace(/\s+/g, "-").toLowerCase()}`}
                className={`sidebar-item ${selectedProvider === provider ? "active" : ""}`}
                onClick={() => handleSelect(provider)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleSelect(provider)}
              >
                <div className="sidebar-item-icon">
                  {getProviderInitial(provider)}
                </div>
                <span className="sidebar-item-name">{provider}</span>
                <span className="sidebar-item-count">
                  {getAccountCount(provider)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
