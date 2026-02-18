/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@supabase/supabase-js"],
  },
  // Enable strict mode for better error catching
  reactStrictMode: true,
  // Improve build performance
  swcMinify: true,
};

export default nextConfig;
