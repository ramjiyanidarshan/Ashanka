"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "@/lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await authApi.login(username, password);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "Invalid username or password"
            : "Login failed. Please try again."
        );
      } else {
        setError("Cannot connect to the server. Make sure the backend is running.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Background orbs */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🔐</div>
          <div>
            <div className="login-title">Veshtit</div>
            <div className="login-subtitle">Digital Account Manager</div>
          </div>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          {error && <div className="login-error" id="login-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="login-username">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={isLoading}
            style={{ marginTop: "0.5rem" }}
          >
            {isLoading ? (
              <>
                <svg
                  className="spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "0.75rem",
            background: "var(--bg-tertiary)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          🔒 All account data is AES-256-GCM encrypted at rest.
        </div>
      </div>
    </div>
  );
}
