// pages/api/drive-upload-url.js
import { google } from "googleapis";
import axios from "axios";

export const config = {
  api: {
    bodyParser: true,
  },
};

const getDriveAuth = async () => {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive"]
  );
  await auth.authorize();
  const accessToken = auth.credentials.access_token;
  return accessToken;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { filename, mimeType } = req.body;
    console.log(
      `[API drive-upload-url] Request received for filename: ${filename}, mimeType: ${mimeType}`
    );

    if (!filename || !mimeType) {
      return res
        .status(400)
        .json({ error: "Filename and mimeType are required." });
    }

    const accessToken = await getDriveAuth();
    console.log("[API drive-upload-url] Access Token obtained.");

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    console.log(
      `[API drive-upload-url] Using GOOGLE_DRIVE_FOLDER_ID: ${folderId}`
    );

    const fileMetadata = {
      name: filename,
      parents: [folderId],
      mimeType: mimeType,
    };

    const initiateUploadResponse = await axios.post(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`,
      fileMetadata, // Metadata dikirim sebagai body POST
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8", // Metadata adalah JSON
          "X-Upload-Content-Type": mimeType, // Tipe konten yang akan diunggah
          // 'X-Upload-Content-Length': '0', // <--- HAPUS ATAU KOMEN BARIS INI
        },
      }
    );

    console.log(
      `[API drive-upload-url] Google Drive initiate upload response status: ${initiateUploadResponse.status}`
    );
    console.log(
      `[API drive-upload-url] Google Drive initiate upload response headers:`,
      initiateUploadResponse.headers
    );
    console.log(
      `[API drive-upload-url] Google Drive initiate upload response data:`,
      initiateUploadResponse.data
    );

    const uploadUrl = initiateUploadResponse.headers.location;

    if (!uploadUrl) {
      throw new Error(
        "Failed to get resumable upload URL from Google Drive. Location header missing in Axios response. Check server logs for full Google Drive response."
      );
    }

    return res.status(200).json({ uploadUrl });
  } catch (error) {
    console.error(`[API drive-upload-url] Caught error: ${error.message}`);
    if (error.response) {
      console.error(
        `[API drive-upload-url] Axios error response status: ${error.response.status}`
      );
      console.error(
        `[API drive-upload-url] Axios error response headers:`,
        error.response.headers
      );
      console.error(
        `[API drive-upload-url] Axios error response data:`,
        error.response.data
      );
    }
    return res
      .status(500)
      .json({ error: error.message || "Failed to get upload URL" });
  }
}
