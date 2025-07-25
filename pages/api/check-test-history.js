// Konfigurasi Kintone untuk App Test Result
const KINTONE_DOMAIN = "lpklink.cybozu.com";
const APP_ID = 276;
const API_TOKEN = "Zm0HaYc5vAQv72Gg9F5nrIn4faCDxqu9N0HYhmB5";

export default async function handler(req, res) {
  // Hanya izinkan method POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // Buat query untuk Kintone
  const testTitle = "JLPT N5 Tes Singkat";
  const query = `email = "${email}" and title = "${testTitle}" limit 1`;
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
    const hasTakenTest = data.records.length > 0;

    // Kirim respons ke client
    res.status(200).json({ hasTakenTest });
  } catch (error) {
    console.error("Failed to fetch from Kintone:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
