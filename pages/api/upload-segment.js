// pages/api/upload-segment.js
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false, // penting, agar Formidable bisa parse
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Parse form (multipart)
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = new IncomingForm({ multiples: false });
      form.parse(req, (err, fields, files) =>
        err ? reject(err) : resolve({ fields, files })
      );
    });

    const email = fields.email;
    if (!email) {
      return res.status(400).json({ error: "Missing email field" });
    }

    // files.video bisa array atau object
    let file = files.video;
    if (Array.isArray(file)) file = file[0];
    if (!file) {
      return res.status(400).json({ error: "Missing video field" });
    }

    // path ke file temp
    const tempPath = file.filepath || file.path;
    if (typeof tempPath !== "string") {
      return res
        .status(500)
        .json({ error: "Invalid temp file path in upload handler" });
    }

    // siapkan folder user
    const userDir = path.join(process.cwd(), "public", "videos", email);
    fs.mkdirSync(userDir, { recursive: true });

    // nama file: gunakan original name
    const filename = file.originalFilename || file.newFilename || file.name;
    const destPath = path.join(userDir, filename);

    // pindahkan dari temp ke folder tujuan
    fs.renameSync(tempPath, destPath);

    // URL relatif + encode email
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
