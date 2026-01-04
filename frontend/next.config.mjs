/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for optimized Docker deployment
  
  // Proxy API requests to backend service
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
