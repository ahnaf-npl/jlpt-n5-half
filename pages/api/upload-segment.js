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

  const tmpDir = path.join(process.cwd(), "public", "videos", "tmp");
  await fs.promises.mkdir(tmpDir, { recursive: true });

  const form = formidable({
    uploadDir: tmpDir,
    keepExtensions: true,
    multiples: false,
  });

  try {
    await new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) return reject(err);

        // pure JS: no "as string"
        const email = fields.email;
        if (!email) {
          res.status(400).json({ error: "Missing email" });
          return reject(new Error("Missing email"));
        }

        let file = Array.isArray(files.video) ? files.video[0] : files.video;
        if (!file) {
          res.status(400).json({ error: "No file uploaded" });
          return reject(new Error("No file uploaded"));
        }

        // pure JS: no "as any"
        const tempPath = file.filepath || file.path;
        const destDir = path.join(process.cwd(), "public", "videos", email);
        await fs.promises.mkdir(destDir, { recursive: true });

        const fileName = path.basename(tempPath);
        const destPath = path.join(destDir, fileName);
        await fs.promises.rename(tempPath, destPath);

        const videoUrl = `/videos/${encodeURIComponent(email)}/${fileName}`;
        res.status(200).json({ videoUrl });
        resolve();
      });
    });
  } catch (e) {
    console.error("upload-segment error:", e);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  }
}
