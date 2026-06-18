"use client";

import { useState, useRef } from "react";
import type {
  ImportAnalysis,
  ImportConflict,
  ConflictResolution,
  ConflictDecision,
  ImportEntry,
} from "@/lib/types";
import { importApi } from "@/lib/api";

interface ImportWizardProps {
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = "upload" | "preview" | "conflicts" | "done";

interface ResolutionMap {
  [conflictIndex: number]: ConflictResolution;
}

export default function ImportWizard({
  onClose,
  onImportComplete,
}: ImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [jsonText, setJsonText] = useState("");
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [resolutions, setResolutions] = useState<ResolutionMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [importProgress, setImportProgress] = useState<{
    done: number; total: number;
    log: { action: string; provider: string }[];
  } | null>(null);
  const [result, setResult] = useState<{ inserted: number; updated: number; ignored: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps: Step[] = ["upload", "preview", "conflicts", "done"];
  const stepIndex = steps.indexOf(step);

  async function handleAnalyze() {
    setError("");
    setIsLoading(true);
    try {
      const parsed = JSON.parse(jsonText);
      const result = await importApi.analyze(parsed);
      setAnalysis(result);
      const defaults: ResolutionMap = {};
      result.conflicts.forEach((_, idx) => { defaults[idx] = "ignore"; });
      setResolutions(defaults);
      if (result.conflicts.length === 0) {
        setStep("preview"); // show progress during finalize
        await finalize(result.toInsert, []);
      } else {
        setStep("conflicts");
      }
    } catch (err) {
      if (err instanceof SyntaxError) setError("Invalid JSON: " + err.message);
      else setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function finalize(
    toInsert: ImportEntry[],
    conflictDecisions: ConflictDecision[]
  ) {
    setIsLoading(true);
    setImportProgress({ done: 0, total: toInsert.length + conflictDecisions.length, log: [] });

    try {
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
      const res = await fetch(`${BACKEND}/api/import/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toInsert, resolutions: conflictDecisions }),
      });

      if (!res.ok || !res.body) {
        setError("Import failed: " + res.statusText);
        setIsLoading(false);
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
              type: string; done?: number; total?: number;
              action?: string; provider?: string;
              summary?: { inserted: number; updated: number; ignored: number; errors: string[] };
              message?: string;
            };

            if (msg.type === "start") {
              setImportProgress({ done: 0, total: msg.total ?? 0, log: [] });
            } else if (msg.type === "progress") {
              setImportProgress((prev) => ({
                done: msg.done ?? (prev?.done ?? 0),
                total: msg.total ?? (prev?.total ?? 0),
                log: prev ? [...prev.log, { action: msg.action ?? "insert", provider: msg.provider ?? "" }] : [],
              }));
            } else if (msg.type === "done") {
              setResult(msg.summary ? { inserted: msg.summary.inserted, updated: msg.summary.updated, ignored: msg.summary.ignored } : { inserted: 0, updated: 0, ignored: 0 });
              setStep("done");
              onImportComplete();
            } else if (msg.type === "error") {
              setError(msg.message ?? "Import error");
            }
          } catch { /* malformed */ }
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResolveConflicts() {
    if (!analysis) return;

    const decisions: ConflictDecision[] = analysis.conflicts.map(
      (conflict, idx) => ({
        existingId: conflict.existing._id,
        resolution: resolutions[idx] ?? "ignore",
        incoming: conflict.incoming,
      })
    );

    await finalize(analysis.toInsert, decisions);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText(ev.target?.result as string);
    };
    reader.readAsText(file);
  }

  function parsePreview() {
    try {
      const parsed = JSON.parse(jsonText);
      const providers = Object.keys(parsed);
      const totalEntries = providers.reduce(
        (sum, p) => sum + (Array.isArray(parsed[p]) ? parsed[p].length : 0),
        0
      );
      return { providers, totalEntries, valid: true };
    } catch {
      return { providers: [], totalEntries: 0, valid: false };
    }
  }

  const preview = jsonText ? parsePreview() : null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Import Accounts</h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Import from your Veshtit JSON format
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="import-close-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: "0.75rem 1.5rem 0" }}>
          <div className="step-indicator">
            {["Upload", "Conflicts", "Done"].map((label, i) => (
              <div
                key={label}
                className={`step-dot ${
                  stepIndex > i ? "done" : stepIndex === i ? "active" : ""
                }`}
                title={label}
              />
            ))}
          </div>
        </div>

        <div className="modal-body">
          {error && <div className="login-error" style={{ marginBottom: "1rem" }}>{error}</div>}

          {/* Step: Upload */}
          {step === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="form-label" style={{ marginBottom: "0.5rem", display: "block" }}>
                  Upload JSON file
                </label>
                <div
                  style={{
                    border: "1px dashed var(--border-strong)",
                    borderRadius: "var(--radius-lg)",
                    padding: "1.5rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "var(--accent-primary-dim)",
                    transition: "all var(--transition-fast)",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📂</div>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    Click to upload a JSON file
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    or paste JSON below
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                    id="import-file-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="import-json-text">
                  Or paste JSON directly
                </label>
                <textarea
                  id="import-json-text"
                  className="form-input mono"
                  rows={8}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder={`{\n  "GitHub": [\n    { "E-Mail": "you@example.com", "Password": "secret" }\n  ]\n}`}
                  style={{ resize: "vertical" }}
                />
              </div>

              {preview && (
                <div
                  style={{
                    background: preview.valid
                      ? "var(--accent-success-dim)"
                      : "var(--accent-danger-dim)",
                    border: `1px solid ${
                      preview.valid
                        ? "rgba(74,222,128,0.2)"
                        : "rgba(248,113,113,0.2)"
                    }`,
                    borderRadius: "var(--radius-md)",
                    padding: "0.75rem",
                    fontSize: "0.8rem",
                    color: preview.valid
                      ? "var(--accent-success)"
                      : "var(--accent-danger)",
                  }}
                >
                  {preview.valid
                    ? `✓ Valid JSON — ${preview.providers.length} providers, ${preview.totalEntries} entries`
                    : "✗ Invalid JSON format"}
                </div>
              )}
            </div>
          )}

          {/* Step: Preview — import in progress (SSE stream) */}
          {step === "preview" && importProgress && (
            <div className="import-progress-box">
              <div className="import-progress-header">
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Importing accounts…</span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {importProgress.done} / {importProgress.total}
                </span>
              </div>
              <div className="import-progress-track">
                <div className="import-progress-fill" style={{
                  width: importProgress.total > 0
                    ? `${Math.round((importProgress.done / importProgress.total) * 100)}%`
                    : "5%",
                }} />
              </div>
              <div style={{ textAlign: "right", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                {importProgress.total > 0 ? `${Math.round((importProgress.done / importProgress.total) * 100)}%` : "Starting…"}
              </div>
              <div className="import-progress-log">
                {importProgress.log.length === 0 && (
                  <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Connecting…</span>
                )}
                {importProgress.log.slice(-20).map((entry, i) => (
                  <div key={i} className={`import-progress-log-entry ${entry.action}`}>
                    <span>{entry.action === "insert" ? "✦" : entry.action === "update" ? "↻" : entry.action === "error" ? "✗" : "–"}</span>
                    <span style={{ color: "var(--text-muted)", minWidth: "42px" }}>{entry.action}</span>
                    <span>{entry.provider}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Conflicts */}
          {step === "conflicts" && analysis && (
            <div>
              <div
                style={{
                  background: "var(--accent-warning-dim)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  fontSize: "0.8rem",
                  color: "var(--accent-warning)",
                }}
              >
                ⚠ {analysis.summary.conflictCount} conflict
                {analysis.summary.conflictCount !== 1 ? "s" : ""} found.{" "}
                {analysis.summary.newCount} new entries will be imported automatically.
              </div>

              {analysis.conflicts.map((conflict, idx) => (
                <ConflictCard
                  key={idx}
                  conflict={conflict}
                  resolution={resolutions[idx] ?? "ignore"}
                  onChange={(r) =>
                    setResolutions((prev) => ({ ...prev, [idx]: r }))
                  }
                />
              ))}
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && result && (
            <div className="empty-state" style={{ padding: "2rem" }}>
              <div className="empty-state-icon" style={{ fontSize: "2rem" }}>✅</div>
              <h3 className="empty-state-title">Import Complete!</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "1rem",
                  width: "100%",
                  marginTop: "0.5rem",
                }}
              >
                {[
                  { label: "Inserted", value: result.inserted, color: "var(--accent-success)" },
                  { label: "Updated", value: result.updated, color: "var(--accent-primary-light)" },
                  { label: "Ignored", value: result.ignored, color: "var(--text-muted)" },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color }}>
                      {value}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === "upload" && (
            <>
              <button className="btn btn-secondary" onClick={onClose} id="import-cancel-btn">
                Cancel
              </button>
              <button
                id="import-analyze-btn"
                className="btn btn-primary"
                onClick={() => {
                  setStep("preview");
                  handleAnalyze();
                }}
                disabled={!jsonText.trim() || isLoading || !preview?.valid}
              >
                {isLoading ? "Analyzing..." : "Import →"}
              </button>
            </>
          )}

          {step === "conflicts" && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep("upload")} id="import-back-btn">
                ← Back
              </button>
              <button
                id="import-resolve-btn"
                className="btn btn-primary"
                onClick={handleResolveConflicts}
                disabled={isLoading}
              >
                {isLoading ? "Importing..." : "Confirm Import"}
              </button>
            </>
          )}

          {step === "done" && (
            <button id="import-done-btn" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConflictCardProps {
  conflict: ImportConflict;
  resolution: ConflictResolution;
  onChange: (r: ConflictResolution) => void;
}

function ConflictCard({ conflict, resolution, onChange }: ConflictCardProps) {
  return (
    <div className="conflict-card">
      <div className="conflict-title">
        ⚠ Conflict — {conflict.incoming.serviceProvider}
      </div>

      <div className="conflict-grid">
        <div>
          <div className="conflict-section-label">Incoming (new)</div>
          {Object.entries(conflict.incoming.attributes)
            .slice(0, 4)
            .map(([k, v]) => (
              <div key={k} style={{ fontSize: "0.75rem", marginBottom: "2px" }}>
                <span style={{ color: "var(--text-muted)" }}>{k}: </span>
                <span style={{ color: "var(--text-primary)" }}>{v ?? "null"}</span>
              </div>
            ))}
        </div>
        <div>
          <div className="conflict-section-label">Existing (in DB)</div>
          {Object.entries(conflict.existing.attributes)
            .slice(0, 4)
            .map(([k, v]) => (
              <div key={k} style={{ fontSize: "0.75rem", marginBottom: "2px" }}>
                <span style={{ color: "var(--text-muted)" }}>{k}: </span>
                <span style={{ color: "var(--text-primary)" }}>{v ?? "null"}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="resolution-options">
        {(["ignore", "update", "add_new"] as ConflictResolution[]).map((r) => (
          <button
            key={r}
            className={`btn resolution-btn ${
              resolution === r ? "btn-primary" : "btn-secondary"
            }`}
            onClick={() => onChange(r)}
            id={`resolve-${r}-${conflict.existing._id}`}
          >
            {r === "ignore" && "Ignore"}
            {r === "update" && "Update Existing"}
            {r === "add_new" && "Add as New"}
          </button>
        ))}
      </div>
    </div>
  );
}
