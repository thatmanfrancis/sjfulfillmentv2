import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true
  }
  // experimental: {
  //   proxyTimeout: 30000,
  // },
  // productionBrowserSourceMaps: false,
  // webpack: (config, { dev }) => {
  //   if (dev) {
  //     config.devtool = false; // Disable source maps in development
  //   }
  //   return config;
  // },
  /* config options here */
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
