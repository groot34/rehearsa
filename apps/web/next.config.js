/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@rehearsa/shared'],
  reactStrictMode: true,
  async rewrites() {
    const apiBase = process.env.API_URL || 'http://localhost:4000';
    return [
      // Proxy all /api/* and /auth/* to the Express backend so the frontend
      // never needs to know the backend port and CORS is handled server-side.
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${apiBase}/auth/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
