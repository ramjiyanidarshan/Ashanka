import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import AppShell from "@/components/AppShell";

export default function AboutPage() {
  let licenseText = "License file not found.";
  try {
    const licensePath = path.join(process.cwd(), "..", "LICENSE");
    licenseText = fs.readFileSync(licensePath, "utf-8");
  } catch (error) {
    console.error("Failed to load license:", error);
  }

  let commitHash = "unknown";
  let commitShort = "unknown";
  try {
    commitHash = execSync("git rev-parse HEAD", { cwd: path.join(process.cwd(), "..") }).toString().trim();
    commitShort = commitHash.slice(0, 7);
  } catch (error) {
    console.error("Failed to read git commit:", error);
  }

  return (
    <AppShell>
      <div className="main-panel">
        <div className="main-panel-header">
          <h2 className="main-panel-title">About अशङ्क</h2>
        </div>
        <div className="main-panel-body" style={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          <div className="about-grid">
            {/* Left Column: Info & Socials */}
            <div className="account-card about-card">
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.svg"
                  width="64"
                  height="64"
                  alt="अशङ्क logo"
                  style={{ display: "block", flexShrink: 0, filter: "drop-shadow(0 4px 12px rgba(239,99,81,0.35))" }}
                />
                <div>
                  <h3 className="brand-devanagari" style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, textAlign: "left" }}>अशङ्क&nbsp;<span><sup>&trade;</sup></span></h3>
                  <p className="text-muted" style={{ margin: "0.25rem 0 0" }}>Digital Account Manager</p>
                </div>
              </div>

              {/* Sanskrit meaning block */}
              <div style={{
                background: "linear-gradient(135deg, rgba(255,107,53,0.08) 0%, rgba(255,60,172,0.08) 100%)",
                border: "1px solid rgba(255,107,53,0.2)",
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.25rem",
              }}>
                <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.35rem" }}>
                  <span className="brand-devanagari" style={{ fontSize: "1.2rem" }}>अशङ्क</span>
                  {" "}
                  <span style={{ fontStyle: "italic", color: "var(--text-muted)", fontWeight: 400, fontSize: "0.9rem" }}>(aśaṅka)</span>
                </p>
                <p className="text-muted" style={{ margin: 0, lineHeight: 1.6, fontSize: "0.9rem" }}>
                  A Sanskrit word meaning <strong style={{ color: "var(--text-main)" }}>&ldquo;Secure&rdquo;</strong> — literally <em>without fear or doubt</em>. Built to keep your digital credentials safe, private, and fully under your control.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-main)" }}><u>Developer Information</u></h4>
                <p className="text-muted" style={{ marginBottom: "0.5rem" }}>Designed and developed by <strong><a href="https://www.darshanramjiyani.com">Darshan Ramjiyani</a></strong>.</p>
                <p className="text-muted" style={{ lineHeight: 1.5 }}>A highly secure, offline-first AES-256 encrypted local password manager designed to keep your sensitive accounts safe, private, and fully under your control.</p>
                <p className="text-muted" style={{ lineHeight: 1.5, color: "var(--text-muted)", marginTop: "0.5rem" }}>अशङ्क (aśaṅka) is a registered trademark of Darshan Ramjiyani.</p>
                <p className="text-muted" style={{ lineHeight: 1.5 }}>Logo Icon by eidez on <a href="https://icon-icons.com/authors/962-eidez">Icon-Icons.com</a></p>
              </div>

              <div>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-main)" }}><u>Release</u></h4>
                <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                  {" "}
                  <code style={{
                    background: "var(--bg-primary)",
                    padding: "0.5rem 0.5rem",
                    borderRadius: "25px",
                    border: "1px solid var(--border-subtle)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8rem",
                    letterSpacing: "0.03em"
                  }}>
                    {commitShort}
                  </code>
                </p>
              </div>

            </div>

            {/* Right Column: License */}
            <div className="account-card about-card about-license-card">
              <h4 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-main)", textAlign: "center", flexShrink: 0 }}>License</h4>
              <p className="text-muted" style={{ marginBottom: "1rem", fontSize: "0.9rem", textAlign: "center", flexShrink: 0 }}>
                अशङ्क (aśaṅka) is open-source software licensed as follows:
              </p>
              <pre className="about-license-pre">
                {licenseText}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
