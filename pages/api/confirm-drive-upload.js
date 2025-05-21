// pages/api/confirm-drive-upload.js
import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });
  const { fileId } = req.body;
  if (!fileId) return res.status(400).json({ error: "fileId required" });

  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
  );
  const drive = google.drive({ version: "v3", auth });

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });
  const { data } = await drive.files.get({
    fileId,
    fields: "webViewLink",
  });
  res.status(200).json({ videoUrl: data.webViewLink });
}
