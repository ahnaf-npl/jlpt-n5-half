// Konfigurasi Kintone untuk App Unique Code
const KINTONE_DOMAIN = "lpklink.cybozu.com";
const APP_ID = 543;
const API_TOKEN = "9RSthmZHTnkfHPBGjSYs08FyWxFhd9GWFOnXWyX1";

export default async function handler(req, res) {
  // Hanya izinkan method POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { uniqueCode: userInputCode } = req.body;

  if (!userInputCode) {
    return res.status(400).json({ message: "Unique code is required" });
  }

  // Buat query untuk Kintone
  const testName = "JLPT N5 Tes Singkat";
  const query = `test_name = "${testName}" limit 1`;
  const encodedQuery = encodeURIComponent(query);

  const url = `https://${KINTONE_DOMAIN}/k/v1/records.json?app=${APP_ID}&query=${encodedQuery}`;

  try {
    const kintoneRes = await fetch(url, {
      method: "GET",
      headers: {
        "X-Cybozu-API-Token": API_TOKEN,
      },
    });

    if (!kintoneRes.ok) {
      const errorBody = await kintoneRes.text();
      console.error("Kintone API Error:", errorBody);
      throw new Error(`Kintone API responded with status ${kintoneRes.status}`);
    }

    const data = await kintoneRes.json();

    if (data.records.length === 0) {
      // Jika record test_name tidak ditemukan sama sekali
      return res
        .status(200)
        .json({ isValid: false, message: "Konfigurasi tes tidak ditemukan." });
    }

    const correctCode = data.records[0].unique_code.value;
    const isValid = userInputCode === correctCode;

    res.status(200).json({ isValid });
  } catch (error) {
    console.error("Failed to fetch or verify unique code:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
