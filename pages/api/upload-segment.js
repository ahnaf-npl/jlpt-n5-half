// pages/api/upload-segment.js
import { put } from "@vercel/blob"; // Hanya import 'put' dari '@vercel/blob'

export const config = {
  api: {
    // Penting: bodyparser HARUS false agar kita bisa membaca stream secara manual.
    // Ini juga untuk menghindari batasan 4.5MB Vercel Functions.
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let filename;
  let mimeType;

  try {
    // --- PERBAIKAN KRUSIAL: Membaca body JSON dari stream ---
    const chunks = [];
    // Mendengarkan event 'data' untuk mengumpulkan chunk
    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    // Mendengarkan event 'end' ketika semua data telah diterima
    await new Promise((resolve, reject) => {
      req.on("end", () => {
        try {
          const bodyBuffer = Buffer.concat(chunks);
          const body = JSON.parse(bodyBuffer.toString("utf8")); // Pastikan parse sebagai UTF-8

          filename = body.filename;
          mimeType = body.mimeType;
          resolve();
        } catch (parseError) {
          console.error(
            "[API upload-segment] Error parsing request body:",
            parseError
          );
          reject(new Error("Invalid JSON body received."));
        }
      });
      req.on("error", reject); // Tangani error stream
    });

    if (!filename || !mimeType) {
      return res.status(400).json({
        error: "Filename and mimeType are required in the request body.",
      });
    }

    console.log(
      `[API upload-segment] Preparing Vercel Blob put for: ${filename} (${mimeType})`
    );

    // Memanggil `put` dengan Buffer.from('') dan contentType
    // Ini yang akan menginisialisasi client upload dan memberikan signed URL
    const blob = await put(filename, Buffer.from(""), {
      access: "public", // Sesuaikan dengan kebutuhan Anda
      addRandomSuffix: true,
      contentType: mimeType, // Penting untuk menyimpan mimeType yang benar
    });

    console.log(
      `[API upload-segment] Successfully obtained Vercel Blob URL: ${blob.url}`
    );
    return res
      .status(200)
      .json({ uploadUrl: blob.url, vercelBlobUrl: blob.url });
  } catch (error) {
    console.error(
      `[API upload-segment] Error during Vercel Blob URL acquisition:`,
      error
    );
    // Log detail error dari respons jika ada
    if (error.response && error.response.data) {
      console.error(
        "Vercel Blob SDK error details:",
        error.response.status,
        error.response.data
      );
    }
    return res.status(500).json({
      error: error.message || "Failed to get Vercel Blob upload URL.",
    });
  }
}
