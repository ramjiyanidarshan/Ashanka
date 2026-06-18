"use client";

import { useState } from "react";

interface ProviderIconProps {
  name: string;
  url?: string | null;
  size?: number;
}

export default function ProviderIcon({ name, url, size = 32 }: ProviderIconProps) {
  const [hasError, setHasError] = useState(false);

  // Guess the domain based on the URL attribute, or fallback to name.com
  let domain = "";
  if (url) {
    try {
      // Handle urls that might not have http:// prefix
      const validUrl = url.startsWith("http") ? url : `https://${url}`;
      domain = new URL(validUrl).hostname;
    } catch {
      domain = `${name.toLowerCase().replace(/\s+/g, "")}.com`;
    }
  } else {
    domain = `${name.toLowerCase().replace(/\s+/g, "")}.com`;
  }

  const initial = name.charAt(0).toUpperCase();

  if (hasError) {
    return (
      <div
        className="provider-avatar"
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          fontSize: size * 0.5,
          flexShrink: 0,
        }}
      >
        🔐
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      <img
        src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
        alt={`${name} icon`}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
