// pages/api/submitExam.js
import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, id, score, submitTime, elapsed, responses, flags, videoUrls } =
    req.body;
  try {
    // send to Zapier webhook
    await fetch(process.env.ZAPIER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        id,
        score,
        submitTime,
        elapsed,
        responses,
        flags,
        videoUrls,
      }),
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("SubmitExam API error:", err);
    res.status(500).json({ error: err.message });
  }
}
