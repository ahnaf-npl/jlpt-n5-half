/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ZAPIER_WEBHOOK_URL: process.env.ZAPIER_WEBHOOK_URL,
  },
};

export default nextConfig;
