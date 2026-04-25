/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    outputFileTracingIncludes: {
      '/api/reports/(.*)': ['./public/fonts/**/*'],
      '/api/admin/reports/(.*)': ['./public/fonts/**/*'],
    },
  },
};

export default nextConfig;
