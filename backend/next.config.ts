import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Backend is API-only — no page rendering needed from external
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: (() => {
              let url = process.env.FRONTEND_URL || "http://localhost:3000";
              if (url !== "http://localhost:3000" && !url.startsWith("http")) {
                url = "https://" + url;
              }
              // Remove trailing slash if user added it, as CORS requires strict exact matching
              return url.replace(/\/$/, "");
            })(),
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
