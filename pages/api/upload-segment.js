// pages/api/upload-segment.js
import formidable from "formidable";
import fs from "fs";
import path from "path";

// Matikan bodyParser bawaan Next.js untuk endpoint ini
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1) Buat folder tmp di public/videos
  const baseVideosDir = path.join(process.cwd(), "public", "videos");
  const tmpDir = path.join(baseVideosDir, "tmp");
  await fs.promises.mkdir(tmpDir, { recursive: true });

  // 2) Setup formidable untuk upload
  const form = formidable({
    uploadDir: tmpDir,
    keepExtensions: true,
    multiples: false,
  });

  try {
    // 3) Parse form data
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    // 4) Ambil dan validasi id
    let id = fields.id;
    if (Array.isArray(id)) id = id[0];
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "Missing id" });
    }
    // kita pakai id mentah (biasanya angka atau alfanumerik),
    // tapi kalau mengandung karakter khusus, bisa juga di-encode:
    const safeId = encodeURIComponent(id);

    // 5) Ambil file upload
    let file = files.video;
    if (Array.isArray(file)) file = file[0];
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 6) Normalisasi tempPath
    let tempPath = file.filepath || file.path;
    if (Array.isArray(tempPath)) tempPath = tempPath[0];
    if (typeof tempPath !== "string") {
      return res.status(500).json({ error: "Invalid temp file path" });
    }

    // 7) Buat folder per-id
    const destDir = path.join(baseVideosDir, safeId);
    await fs.promises.mkdir(destDir, { recursive: true });

    // 8) Pindahkan file ke folder id
    const fileName = path.basename(tempPath);
    const destPath = path.join(destDir, fileName);
    await fs.promises.rename(tempPath, destPath);

    // 9) Kembalikan URL yang bisa diakses
    const videoUrl = `/videos/${safeId}/${fileName}`;
    return res.status(200).json({ videoUrl });
  } catch (e) {
    console.error("upload-segment error:", e);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  }
}
