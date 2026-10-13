import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["mysql2"],
  outputFileTracingIncludes: {
    "/api/solicitudes": ["./public/logo-email.png", "./public/images/home/oc-logo-oficial.png"],
    "/admin": ["./public/logo-email.png", "./public/images/home/oc-logo-oficial.png"],
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
