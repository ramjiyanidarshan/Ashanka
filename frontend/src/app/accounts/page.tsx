"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { accountsApi, exportApi, ApiError } from "@/lib/api";
import type { Account, GroupedAccounts } from "@/lib/types";

import Navbar from "@/components/Navbar";
import ProviderList from "@/components/ProviderList";
import AccountDetail from "@/components/AccountDetail";
import AccountForm from "@/components/AccountForm";
import ImportWizard from "@/components/ImportWizard";

type ModalMode = "create" | "edit" | null;

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

let toastCounter = 0;

export default function DashboardPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [grouped, setGrouped] = useState<GroupedAccounts>({});
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Account | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Mobile state: sidebar drawer open/close, and whether we're viewing detail
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  function addToast(type: Toast["type"], message: string) {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  const loadAccounts = useCallback(async () => {
    try {
      const data = await accountsApi.list();
      setAccounts(data.accounts);
      setGrouped(data.grouped);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
      } else {
        addToast("error", "Failed to load accounts");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Auto-select first provider on desktop
  useEffect(() => {
    const providers = Object.keys(grouped);
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers.sort()[0]);
    }
  }, [grouped, selectedProvider]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function handleProviderSelect(provider: string) {
    setSelectedProvider(provider);
    setMobileView("detail"); // switch to detail view on mobile
    setIsMobileMenuOpen(false);
  }

  function handleMobileBack() {
    setMobileView("list");
    setSelectedProvider(null);
  }

  async function handleCreate(
    serviceProvider: string,
    attributes: Record<string, string | null>
  ) {
    setIsSaving(true);
    try {
      await accountsApi.create(serviceProvider, attributes);
      await loadAccounts();
      setSelectedProvider(serviceProvider);
      setMobileView("detail");
      setModalMode(null);
      addToast("success", `Account created for ${serviceProvider}`);
    } catch {
      addToast("error", "Failed to create account");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(
    serviceProvider: string,
    attributes: Record<string, string | null>
  ) {
    if (!editingAccount) return;
    setIsSaving(true);
    try {
      await accountsApi.update(editingAccount._id, { serviceProvider, attributes });
      await loadAccounts();
      setSelectedProvider(serviceProvider);
      setModalMode(null);
      setEditingAccount(null);
      addToast("success", "Account updated");
    } catch {
      addToast("error", "Failed to update account");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(account: Account) {
    try {
      await accountsApi.delete(account._id);
      await loadAccounts();
      setShowDeleteConfirm(null);
      addToast("success", "Account deleted");
    } catch {
      addToast("error", "Failed to delete account");
    }
  }

  async function handleExport() {
    try {
      await exportApi.download();
      addToast("success", "Export downloaded");
    } catch {
      addToast("error", "Export failed");
    }
  }

  const selectedAccounts = selectedProvider ? (grouped[selectedProvider] ?? []) : [];

  return (
    <>
      <div className="app-shell">
        <Navbar
          onImport={() => setShowImport(true)}
          onExport={handleExport}
          onMenuToggle={() => setIsMobileMenuOpen((v) => !v)}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        <div className="app-body">
          {isLoading ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <svg
                className="spin"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <p style={{ color: "var(--text-muted)" }}>Loading accounts...</p>
            </div>
          ) : (
            <>
              {/* Sidebar — always rendered; CSS controls visibility/drawer on mobile */}
              <ProviderList
                grouped={grouped}
                selectedProvider={selectedProvider}
                onSelect={handleProviderSelect}
                onAddNew={() => {
                  setEditingAccount(null);
                  setIsMobileMenuOpen(false);
                  setModalMode("create");
                }}
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
              />

              {/* Main content — CSS hides on mobile when mobileView==="list" */}
              <div
                className={`main-content-wrapper${mobileView === "list" ? " mobile-hide-detail" : ""}`}
              >
                {selectedProvider ? (
                  <AccountDetail
                    accounts={selectedAccounts}
                    providerName={selectedProvider}
                    onEdit={(account) => {
                      setEditingAccount(account);
                      setModalMode("edit");
                    }}
                    onDelete={(account) => setShowDeleteConfirm(account)}
                    onAddNew={() => {
                      setEditingAccount(null);
                      setModalMode("create");
                    }}
                    onBack={handleMobileBack}
                  />
                ) : (
                  <div
                    className="main-panel"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div className="empty-state">
                      <div className="empty-state-icon">🗂️</div>
                      <p className="empty-state-title">Welcome to Veshtit</p>
                      <p className="empty-state-desc">
                        Select a service provider from the sidebar, or create your
                        first account to get started.
                      </p>
                      <button
                        id="get-started-btn"
                        className="btn btn-primary"
                        onClick={() => setModalMode("create")}
                      >
                        + Create First Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setModalMode(null)
          }
        >
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === "create" ? "New Account" : "Edit Account"}
              </h2>
              <button
                id="close-form-modal"
                className="btn btn-ghost btn-icon"
                onClick={() => {
                  setModalMode(null);
                  setEditingAccount(null);
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <AccountForm
                initialData={editingAccount}
                initialProvider={selectedProvider ?? ""}
                onSubmit={modalMode === "create" ? handleCreate : handleUpdate}
                onCancel={() => {
                  setModalMode(null);
                  setEditingAccount(null);
                }}
                isLoading={isSaving}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowDeleteConfirm(null)
          }
        >
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Account</h2>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Are you sure you want to delete this account for{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {showDeleteConfirm.serviceProvider}
                </strong>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                id="cancel-delete-btn"
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                className="btn btn-danger"
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Wizard */}
      {showImport && (
        <ImportWizard
          onClose={() => setShowImport(false)}
          onImportComplete={loadAccounts}
        />
      )}

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>
              {toast.type === "success" && "✓"}
              {toast.type === "error" && "✕"}
              {toast.type === "info" && "ℹ"}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
