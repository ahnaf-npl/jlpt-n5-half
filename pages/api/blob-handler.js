// pages/api/blob-handler.js
import { handleUpload } from "@vercel/blob/client";

export const config = {
  runtime: "edge", // ← penting: jalankan di Edge runtime
  api: { bodyParser: false }, // ← agar body mentah bisa terbaca
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  try {
    // Panggil handleUpload DENGAN SATU OBJEK opsi saja
    const json = await handleUpload({
      request: req, // Edge Request
      token: process.env.BLOB_READ_WRITE_TOKEN, // ambil token dari env
      // (opsional) onBeforeGenerateToken, onUploadCompleted, dll.
    });

    // json → { uploadUrl, clientToken, expiresIn }
    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[blob-handler] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
