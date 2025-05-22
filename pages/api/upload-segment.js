// pages/api/upload-segment.js
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1) Pastikan tmp folder ada
  const tmpDir = path.join(process.cwd(), "public", "videos", "tmp");
  await fs.promises.mkdir(tmpDir, { recursive: true });

  // 2) Setup formidable
  const form = formidable({
    uploadDir: tmpDir,
    keepExtensions: true,
    multiples: false,
  });

  try {
    // 3) Parse sebagai Promise
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        console.log("🔍 fields:", fields);
        console.log("🔍 files:", Object.keys(files), files.video);
        resolve({ fields, files });
      });
    });

    // 4) Normalisasi email
    let email = fields.email;
    if (Array.isArray(email)) email = email[0];
    if (typeof email !== "string" || !email) {
      return res.status(400).json({ error: "Missing email" });
    }

    // 5) Normalisasi file object
    let file = files.video;
    if (Array.isArray(file)) file = file[0];
    if (!file || typeof file !== "object") {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 6) Normalisasi tempPath
    let tempPath = file.filepath || file.path;
    if (Array.isArray(tempPath)) tempPath = tempPath[0];
    if (typeof tempPath !== "string") {
      console.error("Invalid tempPath:", tempPath);
      return res.status(500).json({ error: "Invalid temp file path" });
    }

    // 7) Buat folder per-user
    const destDir = path.join(process.cwd(), "public", "videos", email);
    await fs.promises.mkdir(destDir, { recursive: true });

    // 8) Pindahkan file
    const fileName = path.basename(tempPath);
    const destPath = path.join(destDir, fileName);
    await fs.promises.rename(tempPath, destPath);

    // 9) Kembalikan URL
    const videoUrl = `/videos/${encodeURIComponent(email)}/${fileName}`;
    return res.status(200).json({ videoUrl });
  } catch (e) {
    console.error("❌ upload-segment error:", e);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  }
}
