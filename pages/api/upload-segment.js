// pages/api/upload-segment.js
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Pastikan folder tmp ada
  const tmpDir = path.join(process.cwd(), "public", "videos", "tmp");
  await fs.promises.mkdir(tmpDir, { recursive: true });

  // Formidable v3 usage
  const form = formidable({
    uploadDir: tmpDir,
    keepExtensions: true,
    multiples: false,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const email = fields.email;
    if (!email) return res.status(400).json({ error: "Missing email" });

    let file = Array.isArray(files.video) ? files.video[0] : files.video;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const tempPath = file.filepath || file.path;
    const destDir = path.join(process.cwd(), "public", "videos", email);
    await fs.promises.mkdir(destDir, { recursive: true });

    const fileName = path.basename(tempPath);
    const destPath = path.join(destDir, fileName);

    try {
      await fs.promises.rename(tempPath, destPath);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }

    // Gunakan backticks di sini!
    const videoUrl = `/videos/${encodeURIComponent(email)}/${fileName}`;
    return res.status(200).json({ videoUrl });
  });
}
