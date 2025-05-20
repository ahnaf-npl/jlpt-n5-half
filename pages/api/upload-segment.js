// pages/api/upload-segment.js
import { google } from "googleapis";
import axios from "axios";
import formidable from "formidable";
import fs from "fs/promises"; // Menggunakan fs/promises untuk async/await

export const config = {
  api: {
    bodyParser: false, // Penting! Jangan parse body secara otomatis
  },
};

const getDriveAuth = async () => {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Perhatikan '\n'
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
    const accessToken = await getDriveAuth();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const form = formidable({
      maxFileSize: 200 * 1024 * 1024, // 200MB, sesuaikan kebutuhan Anda
    });

    let fields;
    let files;
    try {
      [fields, files] = await form.parse(req);
    } catch (parseError) {
      console.error("[API upload-segment] Formidable parse error:", parseError);
      return res.status(400).json({
        error: `Invalid form data or file too large: ${parseError.message}`,
      });
    }

    console.log("[API upload-segment] Parsed form fields:", fields);
    console.log("[API upload-segment] Parsed form files:", files);

    const videoFile = files.video?.[0]; // Mengambil file video pertama dari array 'video'

    // Pastikan nilai-nilai ini diubah menjadi string dan ditrim
    const segmentIndex = parseInt(fields.segmentIndex?.[0] || "0", 10); // Default ke '0' jika undefined
    const mimeType = (fields.mimeType?.[0] || "").trim(); // Pastikan jadi string kosong lalu trim
    // Hapus baris examId dan studentId jika tidak digunakan

    if (!videoFile) {
      return res.status(400).json({
        error:
          'Video file not found in request body. Ensure the "video" field is present in the FormData.',
      });
    }

    if (Number.isNaN(segmentIndex)) {
      return res.status(400).json({
        error:
          "Invalid segmentIndex provided. Ensure segmentIndex is a valid number.",
      });
    }

    // Periksa apakah mimeType kosong setelah trim
    if (!mimeType) {
      // Fallback mimeType jika dari client kosong
      console.warn(
        "[API upload-segment] mimeType from client is empty. Defaulting to video/webm."
      );
      mimeType = "video/webm";
    }

    const videoBuffer = await fs.readFile(videoFile.filepath);
    const filename = (
      videoFile.originalFilename || `segment_${segmentIndex}_${Date.now()}.webm`
    ).trim(); // Pastikan juga filename di-trim

    console.log(
      `[API upload-segment] Processed: filename=${filename}, mimeType=${mimeType}, segmentIndex=${segmentIndex}`
    );
    console.log(
      `[API upload-segment] Video buffer size: ${videoBuffer.length} bytes`
    );

    // Langkah 1: Inisiasi resumable upload untuk mendapatkan uploadUrl
    const fileMetadata = {
      name: filename,
      parents: [folderId],
      mimeType: mimeType,
    };

    const initiateUploadResponse = await axios.post(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`,
      fileMetadata,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
        },
      }
    );

    const uploadUrl = initiateUploadResponse.headers.location;
    if (!uploadUrl) {
      throw new Error(
        "Failed to get resumable upload URL from Google Drive (proxy). Location header missing."
      );
    }
    console.log(
      `[API upload-segment] Obtained Google Drive upload URL: ${uploadUrl}`
    );

    // Langkah 2: Unggah data video ke uploadUrl
    const uploadResponse = await axios.put(uploadUrl, videoBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": videoBuffer.length.toString(),
      },
    });

    console.log(
      `[API upload-segment] Video upload response status: ${uploadResponse.status}`
    );
    console.log(
      `[API upload-segment] Video upload response data:`,
      uploadResponse.data
    );

    // Dapatkan ID file dari respons akhir
    const fileId = uploadResponse.data.id;
    const driveLink = `https://drive.google.com/file/d/${fileId}/view`;

    res.status(200).json({
      message: `Segment ${segmentIndex + 1} uploaded successfully!`,
      videoUrl: driveLink,
      fileId: fileId,
    });
  } catch (error) {
    console.error(`[API upload-segment] Error during proxy upload:`, error);
    if (error.response) {
      console.error(
        `[API upload-segment] Axios error details (response):`,
        error.response.status,
        error.response.headers,
        error.response.data
      );
    }
    // Mengembalikan pesan error yang lebih spesifik jika ada
    res
      .status(500)
      .json({ error: error.message || "Failed to upload segment via proxy." });
  }
}
