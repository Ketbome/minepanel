/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.BUILD_ELECTRON ? "export" : "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: process.env.BUILD_ELECTRON === "true",
  },
  ...(process.env.BUILD_ELECTRON && {
    trailingSlash: true,
  }),
};

module.exports = nextConfig;
