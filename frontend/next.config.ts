import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*/',
        destination: 'https://renescw.pythonanywhere.com/api/:path*/',
      },
      {
        source: '/api/:path*',
        destination: 'https://renescw.pythonanywhere.com/api/:path*/',
      },
      {
        source: '/media/:path*',
        destination: 'https://renescw.pythonanywhere.com/media/:path*',
      },
    ];
  },
};

export default nextConfig;
