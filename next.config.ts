import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xarrchsokuhobwqvcnkg.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-37ec13efdccb46f2bfdd62ab95fbd4d0.r2.dev',
        pathname: '/**',
      },
    ],
  },
  // Repetition locale (branche test uniquement) : autorise les requetes dev +
  // Server Actions venant du tunnel cloudflared ET du reseau local (telephones en WiFi).
  allowedDevOrigins: ['*.trycloudflare.com', '192.168.1.38'],
  experimental: {
    serverActions: {
      bodySizeLimit: '25MB',
      allowedOrigins: ['*.trycloudflare.com', '192.168.1.38:3000', '192.168.1.38:3001'],
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/api/social-card",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400" },
          { key: "CDN-Cache-Control", value: "public, max-age=604800" },
        ],
      },
      {
        source: "/api/candidate-portrait",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400" },
          { key: "CDN-Cache-Control", value: "public, max-age=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
