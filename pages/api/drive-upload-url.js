// pages/api/drive-upload-url.js
import { google } from "googleapis";
import axios from "axios";

export const config = { api: { bodyParser: true } };

async function getDriveAuth() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
  );
  await auth.authorize();
  return auth.credentials.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });
  const { filename, mimeType } = req.body;
  if (!filename || !mimeType)
    return res.status(400).json({ error: "filename & mimeType required" });

  const accessToken = await getDriveAuth();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const metadata = { name: filename, parents: [folderId], mimeType };

  const init = await axios.post(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    metadata,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
      },
    }
  );

  const uploadUrl = init.headers.location;
  if (!uploadUrl)
    return res
      .status(500)
      .json({ error: "No uploadUrl in Drive initiate response" });

  res.status(200).json({ uploadUrl });
}
