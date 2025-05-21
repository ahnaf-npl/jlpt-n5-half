// pages/api/upload-segment.js
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 1) parse multipart
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = new IncomingForm({ multiples: false });
      form.parse(req, (err, fields, files) =>
        err ? reject(err) : resolve({ fields, files })
      );
    });

    // 2) ambil email
    const email = fields.email;
    if (!email) {
      return res.status(400).json({ error: "Missing email field" });
    }

    // 3) ambil file video
    let file = files.video;
    if (Array.isArray(file)) file = file[0];
    if (!file) {
      return res.status(400).json({ error: "Missing video file field" });
    }

    // 4) tentukan tempPath
    let tempPath = file.filepath || file.path;
    if (Array.isArray(tempPath)) tempPath = tempPath[0];
    if (typeof tempPath !== "string") {
      return res.status(500).json({ error: "Invalid temp file path" });
    }

    // 5) buat direktori user di public/videos/<email>
    const userDir = path.join(process.cwd(), "public", "videos", email);
    fs.mkdirSync(userDir, { recursive: true });

    // 6) nama file
    const filename = file.originalFilename || file.newFilename || file.name;
    const destPath = path.join(userDir, filename);

    // 7) pindahkan
    fs.renameSync(tempPath, destPath);

    // 8) kembalikan URL (relatif ke public)
    const videoUrl =
      "/videos/" +
      encodeURIComponent(email) +
      "/" +
      encodeURIComponent(filename);

    return res.status(200).json({ videoUrl });
  } catch (err) {
    console.error("API /api/upload-segment error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to upload segment" });
  }
}
