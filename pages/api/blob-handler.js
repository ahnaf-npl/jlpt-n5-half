// pages/api/blob-handler.js
import { handleUpload } from "@vercel/blob/client";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    // handleUpload otomatis baca body { filename, mimeType } + inject token
    const result = await handleUpload(
      {
        request: req,
        // opsi tambahan (opsional):
        // onBeforeGenerateToken: (name, payload) => ({ addRandomSuffix: true }),
        // onUploadCompleted: ({ blob, tokenPayload }) => { … },
      },
      {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }
    );
    // result: { uploadUrl, clientToken, expiresIn }
    res.status(200).json(result);
  } catch (err) {
    console.error("[blob-handler] ", err);
    res.status(500).json({ error: err.message });
  }
}
