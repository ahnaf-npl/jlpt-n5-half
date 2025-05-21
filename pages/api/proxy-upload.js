// pages/api/proxy-upload.js
import { IncomingForm } from "formidable";
import fs from "fs";
import { google } from "googleapis";

export const config = { api: { bodyParser: false } };

async function uploadToDrive(filePath, filename, mimeType) {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
  );
  const drive = google.drive({ version: "v3", auth });

  const { data } = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      mimeType,
    },
    media: {
      body: fs.createReadStream(filePath),
    },
  });

  await drive.permissions.create({
    fileId: data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  const { data: meta } = await drive.files.get({
    fileId: data.id,
    fields: "webViewLink",
  });
  return meta.webViewLink;
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    new IncomingForm().parse(req, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files })
    );
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");
  try {
    const { files } = await parseForm(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const url = await uploadToDrive(
      file.filepath || file.path,
      file.originalFilename || file.newFilename,
      file.mimetype
    );
    res.status(200).json({ videoUrl: url });
  } catch (e) {
    console.error("Proxy upload error:", e);
    res.status(500).json({ error: e.message });
  }
}
