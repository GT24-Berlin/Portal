/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com'
      },
      {
        protocol: 'https',
        hostname: 'image.clerk.com'
      }
    ]
  },
  turbopack: {
    root: __dirname
  }
};

module.exports = nextConfig;
