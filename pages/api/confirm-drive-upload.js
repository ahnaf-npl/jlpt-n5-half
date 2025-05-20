// pages/api/confirm-drive-upload.js
import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { fileId } = req.body; // Client akan mengirim fileId

    if (!fileId) {
      return res.status(400).json({ error: "fileId is required." });
    }

    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/drive"]
    );
    const drive = google.drive({ version: "v3", auth });

    // Buat file dapat dibaca publik (seperti logika Anda sebelumnya)
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    // Ambil tautan publik
    const meta = await drive.files.get({
      fileId,
      fields: "webViewLink",
    });
    const webViewLink = meta.data.webViewLink;

    console.log(
      `[API confirm-drive-upload] File successfully processed: ${webViewLink}`
    );
    return res.status(200).json({ videoUrl: webViewLink });
  } catch (error) {
    console.error("API /api/confirm-drive-upload error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to confirm upload" });
  }
}
