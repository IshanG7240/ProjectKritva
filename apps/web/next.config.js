import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  transpilePackages: ["@kritva/types"],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/vendor-dashboard",
        destination: "/vendor",
        permanent: true,
      },
      {
        source: "/manage-vendor",
        destination: "/vendor/profile",
        permanent: true,
      },
      {
        source: "/vendors/:id/manage",
        destination: "/vendor/profile",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
