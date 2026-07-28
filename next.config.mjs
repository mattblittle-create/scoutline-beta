// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ Force apex/root domain to redirect to www
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "myscoutline.com",
          },
        ],
        destination: "https://www.myscoutline.com/:path*",
        permanent: true,
      },
    ];
  },

  // ✅ Use remotePatterns (domains is deprecated)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      // Thumbnails (if you ever use next/image with YouTube/Vimeo thumbs)
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "i.vimeocdn.com", pathname: "/**" },
      // Local dev
      { protocol: "http", hostname: "localhost", port: "3000", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "3000", pathname: "/**" },
    ],
  },

  // ✅ Add CSP + helpful security headers
  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    // IMPORTANT:
    // - frame-src now allows YouTube/Vimeo players
    // - img-src includes yt/vimeo thumbs, data:, blob:
    // - media-src allows local <video> and remote MP4 if you ever use them
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      // Who can embed *your* site (not related to iframes you embed). Keeping DENY is fine.
      "frame-ancestors 'none'",

      // Allow images from your storage, thumbnails, and local dev, plus data:/blob: for previews
      "img-src 'self' data: blob: https: http://localhost:3000 http://127.0.0.1:3000",

      // Allow iframes for YouTube/Vimeo embeds
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://securelink-prod.valorpaytech.com https://securelink-staging.valorpaytech.com https://js.valorpaytech.com https://gateway-sb.clearent.net https://gateway-int.clearent.net",

      // If you ever stream MP4s or HLS/DASH segments directly
      "media-src 'self' data: blob: https:",

      // Dev needs inline/eval for HMR
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.valorpaytech.com https://securelink-prod.valorpaytech.com https://securelink-staging.valorpaytech.com https://gateway-sb.clearent.net https://gateway-int.clearent.net",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",

      // Allow API/fetch/websocket connections (adjust as needed)
      "connect-src 'self' https: http: ws: wss: https://js.valorpaytech.com https://securelink-prod.valorpaytech.com https://securelink-staging.valorpaytech.com https://gateway-sb.clearent.net https://gateway-int.clearent.net",
    ].join("; ");

    const securityHeaders = [
      { key: "Content-Security-Policy", value: csp },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      // This controls *your* pages being embedded elsewhere; fine to keep DENY
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      ...(isProd
        ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
        : []),
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;