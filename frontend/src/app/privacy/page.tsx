"use client";

import AppShell from "@/components/AppShell";

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="page-container animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 1rem" }}>
        <header style={{ marginBottom: "3rem", textAlign: "center" }}>
          <h1 className="page-title" style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Privacy Policy</h1>
          <p className="page-subtitle" style={{ fontSize: "1.1rem" }}>
            Last Updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </header>

        <div className="card" style={{ padding: "2.5rem", lineHeight: 1.7, fontSize: "1rem" }}>
          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-primary)" }}>1. Introduction</h2>
            <p style={{ marginBottom: "1rem" }}>
              Welcome to अशङ्क (Ashanka) - Cloud ("we", "our", or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy is formulated in accordance with the Information Technology Act, 2000 (IT Act), the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 (SPDI Rules), and the Digital Personal Data Protection Act, 2023 (DPDP Act) of India.
            </p>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-primary)" }}>2. Data Collection and Usage</h2>
            <p style={{ marginBottom: "1rem" }}>
              As a zero-knowledge, end-to-end encrypted credentials manager, we collect only the minimal data required to provide our services:
            </p>
            <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <li><strong>Account Information:</strong> We collect your username, email address, and a securely hashed version of your master password. We <strong>do not</strong> know or store your master password in plaintext.</li>
              <li><strong>Vault Data:</strong> All credentials, passwords, and sensitive attributes stored in your vault are encrypted on your device using AES-256-GCM before being transmitted to our servers. We cannot decrypt, view, or access your vault data.</li>
              <li><strong>Audit Logs:</strong> We collect metadata related to the usage of the platform (e.g., timestamps of logins, IP addresses, and actions performed) for security, debugging, and audit purposes. Sensitive details within these logs are redacted.</li>
            </ul>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-primary)" }}>3. End-to-End Encryption (E2EE) and Data Integrity</h2>
            <p style={{ marginBottom: "1rem" }}>
              Your privacy is fundamentally guaranteed by our architecture. All sensitive vault data is end-to-end encrypted. The decryption keys are derived from your master password and are never transmitted to our servers. Consequently, neither our administrators nor any third party can read your stored credentials.
            </p>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-primary)" }}>4. Data Sharing and Disclosure</h2>
            <p style={{ marginBottom: "1rem" }}>
              We do not sell, rent, or share your personal data with third parties. We may disclose your non-encrypted data only if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency) under Indian jurisdiction. Please note that since your vault data is E2EE, we cannot provide decrypted vault data to any authority.
            </p>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-primary)" }}>5. User Rights (DPDP Act, 2023)</h2>
            <p style={{ marginBottom: "1rem" }}>
              Under the Digital Personal Data Protection Act, 2023, you have the right to:
            </p>
            <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <li>Access a summary of the personal data processed by us.</li>
              <li>Correct, complete, or update your personal data.</li>
              <li>Request the erasure of your personal data when it is no longer necessary for the purpose for which it was collected.</li>
              <li>Nominate an individual to exercise these rights in the event of death or incapacity.</li>
            </ul>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-primary)" }}>6. Data Grievance Officer</h2>
            <p style={{ marginBottom: "1rem" }}>
              In accordance with the IT Act 2000 and the DPDP Act 2023, we have appointed a Data Grievance Officer to address any discrepancies and grievances. For any privacy-related concerns, please contact the administrator of this deployment.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-primary)" }}>7. Changes to this Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
