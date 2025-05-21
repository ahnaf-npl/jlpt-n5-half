// pages/api/upload-segment.js
import { put } from "@vercel/blob";
import { IncomingForm } from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false }, // kita akan parse FormData sendiri
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files })
    );
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { files } = await parseForm(req);
    // 'video' sesuai key FormData.append("video", blob, filename)
    const file = Array.isArray(files.video) ? files.video[0] : files.video;
    const path = file.filepath || file.path;
    const buffer = fs.readFileSync(path);
    const mimeType = file.mimetype || "application/octet-stream";
    const filename = file.originalFilename || file.newFilename;

    // langsung upload ke Vercel Blob
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: true,
    });

    // blob.url adalah link publik
    return res.status(200).json({ videoUrl: blob.url });
  } catch (err) {
    console.error("Upload-segment API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
