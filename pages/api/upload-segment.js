// pages/api/upload-segment.js
import formidable from "formidable";
import fs from "fs";
import path from "path";

// Matikan built-in bodyParser agar formidable bisa bekerja
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const uploadDir = path.join(process.cwd(), "public", "videos", "tmp");
  // pastikan folder tmp ada
  await fs.promises.mkdir(uploadDir, { recursive: true });

  const form = new formidable.IncomingForm({
    uploadDir,
    keepExtensions: true,
    multiples: false, // <<< penting: satu file saja
    maxFileSize: 200 * 1024 * 1024, // contoh 200MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const email = fields.email;
    if (!email) return res.status(400).json({ error: "Missing email field" });

    // formidable v3+ memakai `filepath`
    const file = files.video;
    const tempPath = file.filepath || file.path;
    if (Array.isArray(tempPath)) {
      return res.status(500).json({ error: "Unexpected array for file path" });
    }

    // siapkan folder tujuan: public/videos/{email}
    const destDir = path.join(process.cwd(), "public", "videos", email);
    await fs.promises.mkdir(destDir, { recursive: true });

    const fileName = path.basename(tempPath);
    const destPath = path.join(destDir, fileName);

    try {
      await fs.promises.rename(tempPath, destPath);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }

    // URL yang nanti dipakai di client
    const videoUrl = `/videos/${encodeURIComponent(email)}/${fileName}`;
    return res.status(200).json({ videoUrl });
  });
}
