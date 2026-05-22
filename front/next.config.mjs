/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features for better compatibility
  experimental: {
    turbo: {
      resolveAlias: {
        // Exclude Node.js modules from browser bundle
        fs: false,
        net: false,
        tls: false,
        canvas: false,
      },
    },
  },
  
  // Webpack fallback for when not using Turbopack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        canvas: false,
      };
    }
    return config;
  },
}

export default nextConfig
