// pages/api/submit-check.js

export default async function handler(req, res) {
  // Hanya izinkan method POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // Ambil URL webhook dari environment variables
  // Pastikan Anda menambahkan ZAPIER_CHECK_WEBHOOK_URL di file .env.local Anda
  const ZAPIER_URL = process.env.ZAPIER_CHECK_WEBHOOK_URL;

  // Jika URL tidak di-set, jangan gagalkan proses, cukup log di server
  if (!ZAPIER_URL) {
    console.error(
      "Kesalahan Konfigurasi: ZAPIER_CHECK_WEBHOOK_URL belum diatur."
    );
    // Kirim respons sukses ke klien karena pengecekan di sisi pengguna tetap valid
    return res.status(200).json({
      success: true,
      message: "Laporan tidak dikirim karena konfigurasi server.",
    });
  }

  try {
    // Ambil semua data pengecekan dari body request
    const checkData = req.body;

    // Kirim data ke Zapier
    const zapierResponse = await fetch(ZAPIER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkData),
    });

    // Periksa apakah Zapier berhasil menerima data
    if (!zapierResponse.ok) {
      throw new Error(
        `Zapier merespons dengan status: ${zapierResponse.status}`
      );
    }

    // Kirim respons sukses kembali ke klien
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Gagal mengirim data pengecekan ke Zapier:", error);
    res
      .status(500)
      .json({ success: false, message: "Gagal mengirim laporan ke server." });
  }
}
