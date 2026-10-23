import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  distDir:
    process.env.PACKET_NEXT_DIST ??
    (process.env.NODE_ENV === "development" ? ".next-dev" : ".next"),
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
