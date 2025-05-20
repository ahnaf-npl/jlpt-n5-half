/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ZAPIER_WEBHOOK_URL: process.env.ZAPIER_WEBHOOK_URL,
  },
  // Tambahkan blok ini untuk meningkatkan batas ukuran payload API
  api: {
    bodyParser: {
      sizeLimit: "50mb", // Anda bisa mencoba '10mb', '50mb', atau '100mb'
    },
  },
};

module.exports = nextConfig; // Pastikan ini adalah `module.exports`

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
//   env: {
//     NEXT_PUBLIC_ZAPIER_WEBHOOK_URL: process.env.ZAPIER_WEBHOOK_URL,
//   },
// };

// export default nextConfig;
