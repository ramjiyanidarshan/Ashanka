import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import AppShell from "@/components/AppShell";

type GitHubContributorApi = {
  login: string;
  avatar_url: string;
  html_url: string;
  url: string;
  contributions: number;
  type: string;
};

type GitHubUserApi = {
  name: string | null;
  bio: string | null;
};

type Contributor = {
  login: string;
  name: string;
  avatarUrl: string;
  profileUrl: string;
  contributions: number;
};

const FALLBACK_REPO = "ramjiyanidarshan/Veshtit";

function getGithubRepoSlug() {
  try {
    const remote = execSync("git config --get remote.origin.url", {
      cwd: path.join(process.cwd(), ".."),
    }).toString().trim();

    if (remote.startsWith("git@")) {
      return remote.split(":").pop()?.replace(/\.git$/, "") || FALLBACK_REPO;
    }

    const parsed = new URL(remote);
    return parsed.pathname.replace(/^\/+/, "").replace(/\.git$/, "") || FALLBACK_REPO;
  } catch {
    return FALLBACK_REPO;
  }
}

async function githubFetch<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Veshtit-about-page",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, {
    headers,
    redirect: "follow",
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`GitHub request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function loadContributors(): Promise<Contributor[]> {
  try {
    const repo = getGithubRepoSlug();
    const contributors = await githubFetch<GitHubContributorApi[]>(
      `https://api.github.com/repos/${repo}/contributors?per_page=100`
    );

    const users = await Promise.all(
      contributors
        .filter((contributor) => contributor.type === "User")
        .map(async (contributor) => {
          try {
            const profile = await githubFetch<GitHubUserApi>(contributor.url);
            return {
              login: contributor.login,
              name: profile.name || contributor.login,
              avatarUrl: contributor.avatar_url,
              profileUrl: contributor.html_url,
              contributions: contributor.contributions,
            };
          } catch {
            return {
              login: contributor.login,
              name: contributor.login,
              avatarUrl: contributor.avatar_url,
              profileUrl: contributor.html_url,
              contributions: contributor.contributions,
            };
          }
        })
    );

    return users;
  } catch (error) {
    console.error("Failed to load GitHub contributors:", error);
    return [];
  }
}

export default async function AboutPage() {
  const contributors = await loadContributors();
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
                <h4 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-main)" }}><u>Concept & Idea</u></h4>
                <p className="text-muted" style={{ marginBottom: "0.5rem" }}>Maintain, Concept & Idea by <strong><a href="https://www.darshanramjiyani.com">Darshan Ramjiyani</a></strong>.</p>
                <p className="text-muted" style={{ lineHeight: 1.5 }}>A highly secure, offline-first AES-256 encrypted local password manager designed to keep your sensitive accounts safe, private, and fully under your control.</p>
                <p className="text-muted" style={{ lineHeight: 1.5, color: "var(--text-muted)", marginTop: "0.5rem" }}>अशङ्क (aśaṅka) is a registered trademark of Darshan Ramjiyani.</p>
              </div>
              <div>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-main)" }}><u>Credits</u></h4>
                <p className="text-muted" style={{ lineHeight: 1.5 }}>Logo Icon by eidez on <a href="https://icon-icons.com/authors/962-eidez">Icon-Icons.com</a></p>
              </div>

              <div>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-main)" }}><u>Contributors</u></h4>
                {contributors.length > 0 ? (
                  <div className="contributors-list">
                    {contributors.map((contributor) => (
                      <a
                        key={contributor.login}
                        className="contributor-card"
                        href={contributor.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={contributor.avatarUrl}
                          alt={`${contributor.name} GitHub profile`}
                          width="44"
                          height="44"
                          className="contributor-avatar"
                        />
                        <span className="contributor-info">
                          <strong>{contributor.name}</strong>
                          <span>@{contributor.login}</span>
                        </span>
                        <span className="contributor-count">{contributor.contributions}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted" style={{ lineHeight: 1.5 }}>
                    Contributors are loaded from GitHub when available.
                  </p>
                )}
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
