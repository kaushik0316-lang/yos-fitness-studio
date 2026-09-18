/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/cron/backup": ["./app/api/cron/backup/base/**"],
    },
  },
};

module.exports = nextConfig;
