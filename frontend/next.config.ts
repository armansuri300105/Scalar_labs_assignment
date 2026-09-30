import type { NextConfig } from "next";

const backendUrl = (
  process.env.NEXT_PUBLIC_API_URL || "https://scalar-labs-assignment.onrender.com"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${backendUrl}/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;
