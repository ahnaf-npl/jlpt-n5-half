// pages/api/upload-segment.js
import path from "path";
import { promises as fs } from "fs";
import { IncomingForm } from "formidable";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const form = new IncomingForm();
  form.uploadDir = path.join(process.cwd(), "public", "videos", "tmp"); // temp upload
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const file = files.video;
    const email = fields.email;
    if (!file || !email)
      return res.status(400).json({ error: "Missing file or email" });

    try {
      const uploadDir = path.join(
        process.cwd(),
        "public",
        "videos",
        encodeURIComponent(email)
      );
      await fs.mkdir(uploadDir, { recursive: true });

      const originalPath = file.filepath || file.file;
      const filename = file.originalFilename || path.basename(originalPath);
      const destination = path.join(uploadDir, filename);

      // Pindahkan (copy+unlink untuk cross-device)
      await fs.copyFile(originalPath, destination);
      await fs.unlink(originalPath);

      const videoUrl = `/videos/${encodeURIComponent(email)}/${filename}`;
      return res.status(200).json({ videoUrl });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  });
}
