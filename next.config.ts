import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["mysql2"],
  outputFileTracingIncludes: {
    "/api/admin/clientes/ventas": ["./public/fonts/contracts/*.ttf", "./public/images/home/oc-logo-oficial.png"],
    "/api/admin/clientes/compromisos/modelos": ["./public/fonts/contracts/*.ttf", "./public/images/home/oc-logo-oficial.png"],
    "/api/clientes/compras/*/compromiso/firma": ["./public/images/home/oc-logo-oficial.png"],
    "/api/cron/encuestas": ["./public/images/home/oc-logo-oficial.png"],
    "/api/admin/clientes/*/categoria": ["./public/images/home/oc-logo-oficial.png"],
    "/api/admin/clientes/nivel-correos": ["./public/images/home/oc-logo-oficial.png"],
    "/api/clientes/compras/*/compromiso/pdf": ["./public/images/home/oc-logo-oficial.png"],
    "/api/admin/clientes/*/verificar-correo": ["./public/images/home/oc-logo-oficial.png"],
    "/api/admin/clientes/ventas/*/compromiso/pdf": ["./public/images/home/oc-logo-oficial.png"],
    "/api/clientes/*": ["./public/images/home/oc-logo-oficial.png"],
    "/api/clientes/soporte/**": ["./public/images/home/oc-logo-oficial.png"],
    "/api/admin/clientes/soporte": ["./public/images/home/oc-logo-oficial.png"],
    "/api/admin/clientes/soporte/**": ["./public/images/home/oc-logo-oficial.png"],
    "/api/solicitudes": ["./public/logo-email.png", "./public/images/home/oc-logo-oficial.png"],
    "/admin": ["./public/logo-email.png", "./public/images/home/oc-logo-oficial.png"],
  },
  async headers() {
    const privateHeaders = [{ key: "Cache-Control", value: "private, no-store" }, { key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "X-Frame-Options", value: "DENY" }, { key: "X-Content-Type-Options", value: "nosniff" }];
    return [
      { source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] },
      ...["/admin/:path*", "/api/admin/:path*", "/encuesta/:path*", "/api/encuestas/:path*", "/api/integraciones/:path*", "/mi-cuenta/:path*", "/api/clientes/:path*"].map(source => ({ source, headers: privateHeaders })),
      ...(process.env.NODE_ENV === "production" ? [{ source: "/admin/:path*", headers: [{
        key: "Content-Security-Policy-Report-Only",
        value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      }] }] : []),
    ];
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
