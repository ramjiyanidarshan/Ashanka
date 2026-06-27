import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import PWAInit from "@/components/PWAInit";

export const metadata: Metadata = {
  title: "अशङ्क — Digital Account Manager",
  description:
    "अशङ्क (aśaṅka) — Secure. Manage all your digital accounts with AES-256 encryption.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "अशङ्क",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b13" },
    { media: "(prefers-color-scheme: light)", color: "#FF6B35" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <PWAInit />
      </body>
    </html>
  );
}
