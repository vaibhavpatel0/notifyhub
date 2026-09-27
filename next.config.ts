import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

// College photos live in Supabase Storage. Only that bucket path may be resized and
// converted by Next.js image optimisation; every other remote image is refused.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseIsLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(supabaseUrl);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [new URL(`${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/**`)],
    formats: ["image/avif", "image/webp"],
    // Local development only: the local Supabase runs on 127.0.0.1.
    dangerouslyAllowLocalIP: supabaseIsLocal,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
