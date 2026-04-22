/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'export' generates static HTML/CSS/JS for Electron desktop packaging.
  // Switch back to 'standalone' for the Docker/server deployment.
  output: 'export',

  // Required for static export — disable server-side image optimization.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
