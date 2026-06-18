"use client";

import { useState } from "react";
import Navbar from "./Navbar";

interface AppShellProps {
  children: React.ReactNode;
  onImport?: () => void;
  onExport?: () => void;
}

export default function AppShell({ children, onImport, onExport }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <Navbar
        onImport={onImport}
        onExport={onExport}
        onMenuToggle={() => setIsMobileMenuOpen((v) => !v)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <div className="app-page-body">
        {children}
      </div>
    </div>
  );
}
