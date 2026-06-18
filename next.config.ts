import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use Webpack for builds (Turbopack has issues with special chars in paths)
  turbopack: undefined,

  // Allow external images from Unsplash
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // Production optimizations
  poweredByHeader: false,
};

export default nextConfig;
