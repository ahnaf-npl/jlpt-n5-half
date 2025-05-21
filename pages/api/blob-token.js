// pages/api/blob-token.js
export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(500).json({ error: "Missing blob token" });
  res.status(200).json({ token });
}
