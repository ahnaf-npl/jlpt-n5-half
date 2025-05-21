// pages/api/upload-segment.js
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";

// Base folder untuk menaruh video
const UPLOAD_BASE = path.join(process.cwd(), "public", "videos");
const TMP_DIR = path.join(UPLOAD_BASE, "tmp");

// Pastikan folder tmp ada
fs.mkdirSync(TMP_DIR, { recursive: true });

export const config = {
  api: { bodyParser: false },
};

export default function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const form = new IncomingForm({
    uploadDir: TMP_DIR,
    keepExtensions: true,
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: err.message });
    }

    // Ambil field email
    const email = fields.email;
    if (!email) {
      return res.status(400).json({ error: "Missing email field" });
    }

    // files bisa array atau object; ambil video upload pertama
    let fileField = files.video;
    if (Array.isArray(fileField)) fileField = fileField[0];
    // fallback jika nama field bukan “video”
    if (!fileField) {
      const first = Object.values(files)[0];
      fileField = Array.isArray(first) ? first[0] : first;
    }
    if (!fileField) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Dapatkan path sementara
    const tmpPath = fileField.filepath || fileField.path;
    if (typeof tmpPath !== "string") {
      console.error("tmpPath is not a string:", tmpPath);
      return res
        .status(500)
        .json({ error: "Internal: upload temp path not found" });
    }

    // Buat folder tujuan public/videos/<email>/
    const destDir = path.join(UPLOAD_BASE, email);
    fs.mkdirSync(destDir, { recursive: true });

    // Pindahkan file
    const filename = path.basename(tmpPath);
    const destPath = path.join(destDir, filename);

    fs.rename(tmpPath, destPath, (renameErr) => {
      if (renameErr) {
        console.error("fs.rename error:", renameErr);
        return res.status(500).json({ error: renameErr.message });
      }
      // Beri URL relatif yang lengkap
      const videoUrl = `/videos/${encodeURIComponent(email)}/${filename}`;
      return res.status(200).json({ videoUrl });
    });
  });
}
