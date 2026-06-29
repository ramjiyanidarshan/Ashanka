"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    authApi.verify()
      .then(() => router.replace("/dashboard"))
      .catch(() => setChecking(false));
  }, [router]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }

    setIsLoading(true);

    try {
      await authApi.register({ email, username, password });
      
      // Auto-login after registration
      await authApi.login({ identifier: username, password });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Registration failed. Please try again.");
      } else {
        setError("Cannot connect to the server. Make sure the backend is running.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (checking) return null;

  return (
    <div className="login-page">
      {/* Background orbs */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg-primary)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div>
            <div className="login-title brand-devanagari">अशङ्क - Cloud</div>
            <div className="login-subtitle">Secure Access Portal</div>
          </div>
        </div>

        <form className="login-form" onSubmit={handleRegister}>
          {error && <div className="login-error" id="register-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-username">
              Username
            </label>
            <input
              id="register-username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-confirm-password">
              Confirm Password
            </label>
            <input
              id="register-confirm-password"
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            id="register-submit"
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
                Creating Account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            style={{ background: "none", border: "none", color: "var(--accent-primary)", cursor: "pointer", padding: 0, font: "inherit", fontWeight: 500 }}
          >
            Sign in
          </button>
        </div>

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
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            All account data is AES-256-GCM encrypted at rest.
          </span>
          <div style={{ marginTop: "0.75rem" }}>
            <button onClick={() => router.push("/privacy")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textDecoration: "underline" }}>Privacy Policy</button>
          </div>
        </div>
      </div>
    </div>
  );
}
