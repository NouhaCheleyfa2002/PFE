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
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        canvas: false,
      };
      
      // Fix for react-pdf and pdfjs-dist
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    
    // Handle pdfjs-dist worker
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: "asset/resource",
      generator: {
        filename: "static/worker/[hash][ext][query]",
      },
    });
    
    return config;
  },
}

export default nextConfig
