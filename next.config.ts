import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "www.seriouseats.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "seriouseats.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
