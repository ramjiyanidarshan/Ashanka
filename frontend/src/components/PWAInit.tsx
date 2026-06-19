"use client";

import { useEffect } from "react";

export default function PWAInit() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[PWA] SW registration failed:", err));
    }
  }, []);

  return null;
}
