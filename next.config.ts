import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["mysql2"],
  outputFileTracingIncludes: {
    "/api/clientes/*": ["./public/images/home/oc-logo-oficial.png"],
    "/api/solicitudes": ["./public/logo-email.png", "./public/images/home/oc-logo-oficial.png"],
    "/admin": ["./public/logo-email.png", "./public/images/home/oc-logo-oficial.png"],
  },
  async headers() {
    const privateHeaders = [{ key: "Cache-Control", value: "private, no-store" }, { key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "X-Frame-Options", value: "DENY" }, { key: "X-Content-Type-Options", value: "nosniff" }];
    return [{ source: "/mi-cuenta/:path*", headers: privateHeaders }, { source: "/admin/clientes/:path*", headers: privateHeaders }, { source: "/api/clientes/:path*", headers: privateHeaders }, { source: "/api/admin/clientes/:path*", headers: privateHeaders }];
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
