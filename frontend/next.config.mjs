/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Server Components
  experimental: {
    // Future experimental features
  },
  // API proxy to backend services in development
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/v1/:path*', // Supervisor service
      },
    ];
  },
};

export default nextConfig;
