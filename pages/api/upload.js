// pages/api/upload.js
import { google } from "googleapis";
import { IncomingForm } from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files })
    );
  });
}

async function uploadToDrive(filePath, filename) {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
  );
  const drive = google.drive({ version: "v3", auth });

  // Create the file in Drive
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    },
    media: {
      mimeType: "video/webm",
      body: fs.createReadStream(filePath),
    },
  });
  const fileId = res.data.id;

  // Make it publicly readable
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  // Pull back the public link
  const meta = await drive.files.get({
    fileId,
    fields: "webViewLink",
  });
  return meta.data.webViewLink;
}

export default async function handler(req, res) {
  try {
    const { files } = await parseForm(req);
    // Pick the first file if multiple were posted
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const path = file.filepath || file.path;
    const name = file.originalFilename || file.newFilename || file.name;

    const videoUrl = await uploadToDrive(path, name);
    return res.status(200).json({ videoUrl });
  } catch (err) {
    console.error("Upload API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
