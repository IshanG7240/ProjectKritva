/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@kritva/types"],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
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
