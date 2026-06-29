"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/* ─── Feature Data for Bento Box ─────────────────────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "AES-256-GCM Encryption",
    desc: "Your credentials are encrypted with military-grade AES-256-GCM — the gold standard for data security. Nobody can read your data, not even us.",
    className: "bento-large",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Offline-First",
    desc: "Runs entirely on your local device. No cloud servers, no third-party databases. Your vault stays where it belongs — with you.",
    className: "bento-medium",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    title: "Security Dashboard",
    desc: "Real-time password health scoring, duplicate detection, and rotation alerts — all at a glance.",
    className: "bento-medium",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: "Open Source",
    desc: "Fully open for inspection. Trust through absolute transparency.",
    className: "bento-small",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: "PWA Ready",
    desc: "Install as a native-like app on any device.",
    className: "bento-small",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    title: "Import & Export",
    desc: "Seamlessly import or export encrypted backups anytime.",
    className: "bento-small",
  },
];

const STATS = [
  { value: "AES-256", label: "Encryption" },
  { value: "100%", label: "Offline" },
  { value: "0", label: "Cloud Servers" },
  { value: "∞", label: "Credentials" },
];

/* ─── Intersection Observer Hook ─────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`landing-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ─── Landing Page ───────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Centered Glowing Background */}
      <div className="landing-bg-center-glow" />

      {/* Grid Pattern overlay */}
      <div className="landing-bg-grid" />

      {/* ─── Sticky Navbar ─────────────────────────────────────────── */}
      <nav className="landing-nav" id="landing-nav">
        <Link href="/" className="landing-nav-brand" id="landing-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" width="32" height="32" alt="अशङ्क logo" style={{ display: "block" }} />
          <span className="landing-nav-wordmark">अशङ्क</span>
        </Link>
        <div className="landing-nav-spacer" />
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-nav-link" id="landing-login-link">
            Sign In
          </Link>
          <Link href="/login" className="landing-cta-sm" id="landing-get-started-nav">
            Get Started
          </Link>
        </div>
      </nav>

      {/* ─── Hero Section (Centered & Minimalist) ──────────────────── */}
      <section className="landing-hero-centered" id="landing-hero">
        <RevealSection>
          <div className="landing-hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Zero-Knowledge Digital Vault
          </div>
        </RevealSection>

        <RevealSection delay={100}>
          <h1 className="landing-hero-title">
            <span className="landing-hero-devanagari">अशङ्क</span>
            <span className="landing-hero-main-line">Fearlessly Secure.</span>
          </h1>
        </RevealSection>

        <RevealSection delay={200}>
          <p className="landing-hero-desc">
            A self-hosted, offline-first password manager built with AES-256 encryption.
            Keep your digital life private, secure, and entirely under your control.
          </p>
        </RevealSection>

        <RevealSection delay={300}>
          <div className="landing-hero-actions">
            <Link href="/login" className="landing-cta-primary" id="landing-hero-cta">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Open Vault
            </Link>
            <a
              href="https://github.com/ramjiyanidarshan/Veshtit"
              target="_blank"
              rel="noreferrer"
              className="landing-cta-secondary"
              id="landing-github-link"
            >
              Star on GitHub ⭐
            </a>
          </div>
        </RevealSection>
      </section>

      {/* ─── Stats Banner ──────────────────────────────────────────── */}
      <section className="landing-stats-banner" id="landing-stats">
        <div className="landing-stats-inner">
          {STATS.map((s, i) => (
            <RevealSection key={s.label} className="landing-stat-box" delay={i * 100}>
              <span className="landing-stat-value">{s.value}</span>
              <span className="landing-stat-label">{s.label}</span>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ─── Bento Box Features ─────────────────────────────────────── */}
      <section className="landing-bento-section" id="landing-features">
        <RevealSection>
          <div className="landing-section-header">
            <h2 className="landing-section-title">
              Why <span className="landing-section-devanagari">अशङ्क</span>?
            </h2>
            <p className="landing-section-desc">
              Engineered for absolute privacy and beautiful user experience.
            </p>
          </div>
        </RevealSection>

        <div className="landing-bento-grid">
          {FEATURES.map((f, i) => (
            <RevealSection key={f.title} className={`landing-bento-card ${f.className}`} delay={i * 80}>
              <div className="landing-bento-icon">{f.icon}</div>
              <div className="landing-bento-content">
                <h3 className="landing-bento-title">{f.title}</h3>
                <p className="landing-bento-desc">{f.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ─── Sanskrit Meaning (Editorial Style) ──────────────────────── */}
      <section className="landing-editorial" id="landing-meaning">
        <RevealSection className="landing-editorial-inner">
          <div className="landing-editorial-bg-glyph">अ</div>
          <div className="landing-editorial-content">
            <h2 className="landing-editorial-word">अशङ्क <span className="landing-editorial-phonetic">/aśaṅka/</span></h2>
            <p className="landing-editorial-definition">
              <em>&ldquo;Without fear or doubt&rdquo;</em>
            </p>
            <p className="landing-editorial-body">
              In the Vedic tradition, <span className="landing-editorial-highlight">अशङ्क</span> represents
              the absolute courage and confidence that comes from knowing you are protected.
              We bring that ancient philosophy to modern digital security.
            </p>
          </div>
        </RevealSection>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────────── */}
      <section className="landing-final-cta" id="landing-cta-section">
        <RevealSection className="landing-cta-inner">
          <h2 className="landing-cta-title">
            Take Back Control.
          </h2>
          <p className="landing-cta-desc">
            Your data is your business. Self-host and encrypt it today.
          </p>
          <Link href="/login" className="landing-cta-primary" id="landing-bottom-cta">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Sign In to Vault
          </Link>
        </RevealSection>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="landing-footer" id="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span>&copy; {new Date().getFullYear()} Darshan Ramjiyani</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" width="28" height="28" alt="अशङ्क" style={{ display: "block" }} />
            <span className="landing-footer-wordmark">अशङ्क</span><sup>&trade;</sup>
          </div>
          <p className="landing-footer-copy">
            A registered trademark of Darshan Ramjiyani. Open-source under Apache-2.0 license.
          </p>
          <div className="landing-footer-links">
            <Link href="/about">About</Link>
            <a href="https://github.com/ramjiyanidarshan/Ashanka" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://www.darshanramjiyani.com" target="_blank" rel="noreferrer">Author</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
