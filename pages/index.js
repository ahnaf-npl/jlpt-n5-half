// pages/index.js
import React, { useState, useEffect, useRef } from "react";
import QUESTION_GROUPS from "../data/questions";

const CONFIG = {
  examDuration: 1800, // 30 minutes in seconds
  recordInterval: 600, // every 10 minutes = 600 seconds
  recordDuration: 180, // record 2 minutes each
  groupCounts: { "文法・文の文法1（後半レベル[20〜27か]）": 20 },
};

function renderRubySegment(seg, key) {
  if (seg.base === "<br>") return <br key={key} />;
  return seg.ruby ? (
    <ruby key={key}>
      {seg.base}
      <rt>{seg.ruby}</rt>
    </ruby>
  ) : (
    <span key={key}>{seg.base}</span>
  );
}

export default function Home() {
  const [step, setStep] = useState("intro");
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState({});
  const [cur, setCur] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CONFIG.examDuration);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [submitTime, setSubmitTime] = useState(null);
  const [elapsed, setElapsed] = useState(null);

  const recorderRef = useRef(null);
  const videoRef = useRef(null);
  const segmentsRef = useRef([]);
  const chunksRef = useRef({});
  const countdownIntervalRef = useRef(null);
  const recordingTimeoutsRef = useRef([]);
  const misuseEventsRef = useRef([]);
  const [stream, setStream] = useState(null);
  const [params, setParams] = useState({ email: "", id: "" });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setParams({ email: p.get("email") || "", id: p.get("id") || "" });
  }, []);

  useEffect(() => {
    clearInterval(countdownIntervalRef.current);
    if (step === "exam") {
      setTimeLeft(CONFIG.examDuration);
      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(countdownIntervalRef.current);
            submitExam();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownIntervalRef.current);
  }, [step]);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  function formatHMS(sec) {
    const h = Math.floor(sec / 3600),
      m = Math.floor((sec % 3600) / 60),
      s = sec % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  async function begin() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(s);
      const questions = generateQuestions();
      setQs(questions);
      setStep("exam");
      setStartTime(Date.now());
      scheduleRecordings(s);
    } catch {
      alert("Izin kamera & mikrofon diperlukan.");
    }
  }

  function generateQuestions() {
    let sel = [];
    for (const [grp, cnt] of Object.entries(CONFIG.groupCounts)) {
      const pool = QUESTION_GROUPS[grp] || [];
      sel.push(...pool.sort(() => 0.5 - Math.random()).slice(0, cnt));
    }
    const sh = sel.sort(() => 0.5 - Math.random());
    sh.forEach((q) => (q.options = q.options.sort(() => 0.5 - Math.random())));
    return sh;
  }

  function scheduleRecordings(stream) {
    recordingTimeoutsRef.current.forEach(clearTimeout);
    recordingTimeoutsRef.current = [];
    segmentsRef.current = [];
    const segs = Math.ceil(CONFIG.examDuration / CONFIG.recordInterval);
    for (let i = 0; i < segs; i++) {
      chunksRef.current[i] = [];
      const tid = setTimeout(() => {
        const rec = new MediaRecorder(stream, {
          mimeType: "video/webm; codecs=vp8",
          videoBitsPerSecond: 250000,
        });
        recorderRef.current = rec;
        rec.ondataavailable = (e) => chunksRef.current[i].push(e.data);
        rec.onstop = () =>
          (segmentsRef.current[i] = new Blob(chunksRef.current[i], {
            type: "video/webm",
          }));
        rec.start();
        setTimeout(() => rec.stop(), CONFIG.recordDuration * 1000);
      }, i * CONFIG.recordInterval * 1000);
      recordingTimeoutsRef.current.push(tid);
    }
  }

  async function submitExam() {
    // stop countdown & scheduled recordings
    clearInterval(countdownIntervalRef.current);
    recordingTimeoutsRef.current.forEach(clearTimeout);
    // stop active recorder
    if (recorderRef.current?.state !== "inactive") recorderRef.current.stop();
    // stop camera preview stream as soon as submit begins
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    setIsSubmitting(true);
    const end = Date.now();
    setSubmitTime(end);
    setElapsed(end - startTime);

    const videoUrls = [];
    for (let i = 0; i < segmentsRef.current.length; i++) {
      const blob = segmentsRef.current[i];
      if (!blob) continue;
      const fname = `${params.email}_${new Date(end)
        .toLocaleString()
        .replace(/\W+/g, "_")}_take${i + 1}.webm`;
      const file = new File([blob], fname, { type: "video/webm" });
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      videoUrls.push(json.videoUrl);
    }

    const correct = qs.filter((q, i) => ans[i] === q.answerIndex).length;
    const score = Math.round((correct / qs.length) * 100);
    const responses = qs.map((q, i) => ({
      question: q.q,
      answer: ans[i] || "",
    }));

    // Send final data to server endpoint to avoid CORS
    await fetch("/api/submitExam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email,
        id: params.id,
        score,
        submitTime: new Date(end).toLocaleString(),
        elapsed: Math.floor((end - startTime) / 1000),
        responses,
        flags: misuseEventsRef.current,
        videoUrls,
      }),
    });

    setIsSubmitting(false);
    setStep("result");
  }

  const finalScore = Math.round(
    (qs.filter((q, i) => ans[i] === q.answerIndex).length / (qs.length || 1)) *
      100
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 select-none relative overflow-hidden">
      <style jsx>{`
        .overlay {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .modal {
          animation: zoomIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes zoomIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overlay">
          <div className="bg-white p-6 rounded shadow modal">
            <svg
              className="animate-spin h-8 w-8 text-blue-600 mb-2"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                className="opacity-25"
              />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                className="opacity-75"
              />
            </svg>
            <p className="text-gray-800">Memproses, mohon tunggu...</p>
          </div>
        </div>
      )}

      {step === "intro" && (
        <div className="flex flex-col items-center justify-center h-full p-4 modal">
          <img
            src="/actstudy_logo.png"
            className="w-52 rounded-top mx-auto mb-8"
            alt="Act Study Logo"
          />
          <div className="text-slate-700 bg-white p-6 rounded shadow max-w-md w-full">
            <h1 className="pb-4 border-b-2 text-2xl font-bold mb-4 text-center">
              TES SINGKAT
              <br />
              JLPT N5
            </h1>

            <p className="mb-4 text-center font-semibold">
              Jumlah Soal : 50 Soal
              <br />
              Batas Waktu : 30 Menit
            </p>

            <p className="mb-2 font-bold text-center text-red-500">
              Penting!
            </p>

            <ul>
              <li>Tes ini tidak bisa dijeda atau dilanjutkan jika</li>
            </ul>

            <p className="text-sm mb-6 text-justify">
              Guna mencegah terjadinya kecurangan, wajah Anda akan direkam
              melalui Kamera depan perangkat Anda selama pengerjaan tes. Tolong
              <strong> izinkan penggunaan Kamera dan Mikrofon</strong>. Silakan
              dikerjakan dengan baik dan jujur.
            </p>
            
            <button
              onClick={begin}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-800 transition-all ease-in"
            >
              Mulai
            </button>
          </div>
        </div>
      )}

      {step === "exam" && (
        <div className="p-4 max-w-2xl mx-auto modal">
          <div className="flex justify-between mb-4">
            <span>Waktu: {formatHMS(timeLeft)}</span>
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-32 h-24 rounded border"
            />
          </div>
          <div className="flex flex-wrap mb-4">
            {qs.map((_, i) => (
              <button
                key={i}
                onClick={() => setCur(i)}
                className={`w-8 h-8 m-1 rounded flex items-center justify-center transition-all duration-200
                  ${ans[i] != null ? "bg-green-500" : "bg-gray-300"}
                  ${i === cur ? "ring-2 ring-blue-600 scale-110" : ""}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="bg-white p-6 rounded shadow">
            <div className="flex justify-between mb-2">
              <button
                onClick={() => cur > 0 && setCur((c) => c - 1)}
                disabled={cur === 0}
                className="px-3 py-1 bg-gray-400 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  cur < qs.length - 1 ? setCur((c) => c + 1) : submitExam()
                }
                className="px-3 py-1 bg-green-500 text-white rounded"
              >
                {cur < qs.length - 1 ? "Next" : "Submit"}
              </button>
            </div>
            {qs[cur].desc && (
              <p className="mb-2 text-gray-700">{qs[cur].desc}</p>
            )}
            <h3 className="mb-4 text-gray-900">
              {Array.isArray(qs[cur].q)
                ? qs[cur].q.map((seg, idx) => renderRubySegment(seg, idx))
                : qs[cur].q}
            </h3>
            {qs[cur].options.map((opt, oi) => (
              <label key={oi} className="block mb-2 text-gray-900">
                <input
                  type="radio"
                  checked={ans[cur] === oi}
                  onChange={() => setAns((a) => ({ ...a, [cur]: oi }))}
                  className="mr-2"
                />
                {Array.isArray(opt)
                  ? opt.map((seg, idx) => renderRubySegment(seg, idx))
                  : opt}
              </label>
            ))}
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="flex flex-col items-center justify-center h-full p-4 modal">
          <div className="bg-white p-6 rounded shadow text-center max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Hasil Ujian</h2>
            <p className="mb-2">Nilai Anda: {finalScore}%</p>
            <p className="mb-1">
              Submit Time: {new Date(submitTime).toLocaleString()}
            </p>
            <p>Durasi: {formatHMS(Math.floor(elapsed / 1000))}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// pages/api/upload.js unchanged
