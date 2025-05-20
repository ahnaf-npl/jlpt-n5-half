// next.config.mjs (Nama file diubah!)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ZAPIER_WEBHOOK_URL: process.env.ZAPIER_WEBHOOK_URL,
  },
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

export default nextConfig; // Ini akan valid jika nama file adalah .mjs
