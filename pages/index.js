// pages/index.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import QUESTION_GROUPS from "../data/questions";

import SubmittingModal from "../components/Modals/SubmittingModal";
import AuthErrorModal from "../components/Modals/AuthErrorModal";
import QuestionMapModal from "../components/Modals/QuestionMapModal";
import ConfirmSubmitModal from "../components/Modals/ConfirmSubmitModal";
import IntroScreen from "../components/Screens/IntroScreen";
import ExamScreen from "../components/Screens/ExamScreen";
import ResultScreen from "../components/Screens/ResultScreen";

const CONFIG = {
  examDuration: 1800, // 30 minutes in seconds
  recordInterval: 600, // every 10 minutes = 600 seconds
  recordDuration: 150, // record 3 minutes each
  groupCounts: {
    "表記（前半レベル [ひらがな・カタカナ] ）": 5,
    "表記（中盤レベル[7〜17か]）": 5,
    "表記（後半レベル[18〜27か]）": 5,
    "語彙・文脈規定（中盤レベル[13〜19か]）": 5,
    "語彙・文脈規定（後半レベル[20〜27か]）": 5,
    "語彙・言い換え類義（中盤レベル[13〜19か]）": 2,
    "語彙・言い換え類義（後半レベル[20〜27か]）": 2,
    "文法・文の文法1（前半レベル[3〜9か]）": 5,
    "文法・文の文法1（中盤レベル[10〜19か]）": 5,
    "文法・文の文法1（後半レベル[20〜27か]）": 5,
    "文法・文の文法2（前半レベル[3〜9か]）": 2,
    "文法・文の文法2（中盤レベル[10〜19か]）": 2,
    "文法・文の文法2（後半レベル[20〜27か]）": 2,
  },
};

// Fungsi helper untuk merender ruby (pindahkan ini jika Anda memisahkannya)
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

function getOptimalMimeType() {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isIOS && MediaRecorder.isTypeSupported("video/mp4")) {
    console.log("Using video/mp4 for iOS device.");
    return "video/mp4";
  } else if (MediaRecorder.isTypeSupported("video/webm; codecs=vp8")) {
    console.log("Using video/webm; codecs=vp8.");
    return "video/webm; codecs=vp8";
  } else if (MediaRecorder.isTypeSupported("video/webm")) {
    console.log("Using video/webm (generic).");
    return "video/webm";
  }
  console.warn(
    "No specific MediaRecorder mimeType supported. Defaulting to video/webm."
  );
  return "video/webm";
}

// ==========================================================
// FUNGSI UPLOAD SEGMENT VIA PROXY (PASTIKAN SUDAH SESUAI DENGAN VERSI TERAKHIR)
// ==========================================================
// async function uploadSegmentThroughProxy(blob, segmentIndex, mimeType) {
//   console.log(
//     `[Client] Uploading segment ${segmentIndex + 1} through local API proxy...`
//   );
//   try {
//     const filename = `video_segment_${segmentIndex + 1}_${Date.now()}.webm`;

//     const formData = new FormData();
//     formData.append("video", blob, filename);
//     formData.append("segmentIndex", segmentIndex.toString());
//     formData.append("mimeType", mimeType);

//     for (const [key, value] of formData.entries()) {
//       console.log(`[Client] FormData entry: ${key}:`, value);
//     }

//     const response = await fetch("/api/upload-segment", {
//       method: "POST",
//       body: formData,
//     });

//     if (!response.ok) {
//       const errorData = await response.json();
//       throw new Error(
//         `Failed to upload segment through proxy: ${response.statusText} - ${errorData.error}`
//       );
//     }

//     const result = await response.json();
//     console.log(
//       `[Client] Segment ${
//         segmentIndex + 1
//       } uploaded successfully via proxy. URL: ${result.videoUrl}`
//     );
//     return result.videoUrl;
//   } catch (error) {
//     console.error(
//       `[Client] Error uploading segment ${segmentIndex + 1} through proxy:`,
//       error
//     );
//     throw error; // Penting untuk melempar error agar promise bisa di-reject
//   }
// }

// Pastikan fungsi ini tersedia dan menerima blob, index, mimeType, dan filename
// Di klien Anda (misalnya di fungsi uploadSegmentThroughProxy yang dimodifikasi)
// async function uploadSegmentThroughProxy(blob, segmentIndex, mimeType) {
//   const filename = `segment_${segmentIndex + 1}_${Date.now()}.webm`;

//   console.log(
//     `[Client] Initiating Vercel Blob upload for segment ${
//       segmentIndex + 1
//     } (${filename})...`
//   );
//   try {
//     // Langkah 1: Minta URL upload yang di-pre-signed dari API Route kita
//     const initiateUploadRes = await fetch("/api/upload-segment", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ filename: filename, mimeType: mimeType }),
//     });

//     if (!initiateUploadRes.ok) {
//       const errorData = await initiateUploadRes.json();
//       throw new Error(
//         `Failed to get Vercel Blob upload URL: ${initiateUploadRes.statusText} - ${errorData.error}`
//       );
//     }

//     const { uploadUrl, vercelBlobUrl } = await initiateUploadRes.json();
//     console.log(`[Client] Received Vercel Blob upload URL: ${uploadUrl}`);

//     // Langkah 2: Unggah blob video langsung ke Vercel Blob menggunakan URL yang di-pre-signed
//     // Tambahkan header 'Content-Length' secara eksplisit
//     const uploadResponse = await fetch(uploadUrl, {
//       method: "PUT",
//       headers: {
//         "Content-Type": mimeType,
//         // Kirim ukuran blob sebagai header custom, bukan Content-Length
//         "x-content-length": blob.size.toString(),
//       },
//       body: blob,
//     });

//     if (!uploadResponse.ok) {
//       const errorText = await uploadResponse.text();
//       throw new Error(
//         `Failed to upload to Vercel Blob directly: ${uploadResponse.statusText} - ${errorText}`
//       );
//     }

//     console.log(
//       `[Client] Segment ${
//         segmentIndex + 1
//       } uploaded successfully to Vercel Blob. URL: ${vercelBlobUrl}`
//     );
//     return vercelBlobUrl;
//   } catch (error) {
//     console.error(
//       `[Client] Error uploading segment ${segmentIndex + 1} to Vercel Blob:`,
//       error
//     );
//     throw error;
//   }
// }

// di client (pages/index.js)
// async function uploadSegmentThroughProxy(blob, segmentIndex) {
//   const filename = `segment_${segmentIndex + 1}_${Date.now()}.webm`;

//   // 1) Buat FormData dan lampirkan Blob
//   const formData = new FormData();
//   formData.append("file", blob, filename);

//   // 2) Kirim ke server endpoint /api/upload (formidable -> Drive)
//   const res = await fetch("/api/upload", {
//     method: "POST",
//     body: formData,
//   });
//   if (!res.ok) {
//     const err = await res.text();
//     throw new Error(`Upload failed: ${err}`);
//   }
//   const { videoUrl } = await res.json();

//   console.log(
//     `[Client] Segment ${segmentIndex + 1} uploaded via Drive:`,
//     videoUrl
//   );
//   return videoUrl;
// }

// async function uploadSegmentThroughProxy(blob, segmentIndex) {
//   const filename = `segment_${segmentIndex + 1}_${Date.now()}.webm`;
//   const mimeType = blob.type;

//   // 1) Minta uploadUrl Drive
//   const initRes = await fetch("/api/drive-upload-url", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ filename, mimeType }),
//   });
//   if (!initRes.ok) {
//     const err = await initRes.text();
//     throw new Error(`Init upload failed: ${err}`);
//   }
//   const { uploadUrl } = await initRes.json();

//   // 2) PUT langsung blob ke Google Drive
//   const putRes = await fetch(uploadUrl, {
//     method: "PUT",
//     headers: {
//       "Content-Type": mimeType,
//       "Content-Length": blob.size.toString(),
//     },
//     body: blob,
//   });
//   if (!putRes.ok) {
//     const err = await putRes.text();
//     throw new Error(`Drive upload failed: ${err}`);
//   }
//   // Response JSON dari Drive berisi metadata termasuk `id`
//   const metadata = await putRes.json();
//   const fileId = metadata.id;
//   if (!fileId) throw new Error("No fileId in Drive upload response");

//   // 3) Konfirmasi dan dapatkan link publik
//   const confRes = await fetch("/api/confirm-drive-upload", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ fileId }),
//   });
//   if (!confRes.ok) {
//     const err = await confRes.text();
//     throw new Error(`Confirm upload failed: ${err}`);
//   }
//   const { videoUrl } = await confRes.json();

//   console.log(`[Client] Segment ${segmentIndex + 1}: ${videoUrl}`);
//   return videoUrl;
// }

// async function uploadSegmentThroughProxy(blob, segmentIndex) {
//   const filename = `segment_${segmentIndex + 1}_${Date.now()}.webm`;
//   const file = new File([blob], filename, { type: blob.type });

//   const { url: videoUrl } = await upload(filename, file, {
//     access: "public",
//     handleUploadUrl: "/api/blob-handler",
//   });

//   console.log(`[Client] Segment ${segmentIndex + 1} uploaded: ${videoUrl}`);
//   return videoUrl;
// }

async function uploadSegmentThroughProxy(blob, segmentIndex) {
  const filename = `seg${segmentIndex + 1}_${Date.now()}.webm`;
  const form = new FormData();
  form.append("video", blob, filename);

  const res = await fetch("/api/upload-segment", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }
  const { videoUrl } = await res.json();
  console.log(`[Client] Segment ${segmentIndex + 1} uploaded:`, videoUrl);
  return videoUrl;
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
  const [isAgreed, setIsAgreed] = useState(false);

  const recorderRef = useRef(null);
  const videoRef = useRef(null);
  const segmentsRef = useRef([]); // Menyimpan Blob dari setiap segmen rekaman
  const chunksRef = useRef({}); // Menyimpan data chunk sementara per segmen
  const countdownIntervalRef = useRef(null); // Ref untuk ID interval timer
  const recordingPromisesRef = useRef([]);
  const recordingTimeoutsRef = useRef([]); // Ref untuk ID timeout penjadwalan rekaman
  const misuseEventsRef = useRef([]); // Ref untuk mencatat event yang mencurigakan/error
  const [stream, setStream] = useState(null); // State untuk stream media (kamera & mic)
  const [params, setParams] = useState({ email: "", id: "" }); // State untuk parameter URL (autentikasi)

  const totalTime = useRef(CONFIG.examDuration); // Simpan durasi total di ref untuk perhitungan progress
  const progress = (timeLeft / totalTime.current) * 100; // Hitung progress bar

  const [authError, setAuthError] = useState(null); // State untuk pesan error autentikasi

  const [isConfirmSubmitModalOpen, setIsConfirmSubmitModalOpen] =
    useState(false); // State untuk modal konfirmasi submit
  const [isQuestionMapModalOpen, setIsQuestionMapModalOpen] = useState(false); // State untuk modal peta soal
  const [isClosingAuthError, setIsClosingAuthError] = useState(false); // State untuk animasi keluar modal auth error
  const [isClosingQuestionMap, setIsClosingQuestionMap] = useState(false); // State untuk animasi keluar modal peta soal
  const [isClosingConfirm, setIsClosingConfirm] = useState(false); // State untuk animasi keluar modal konfirmasi
  const [isClosingSubmitting, setIsClosingSubmitting] = useState(false); // State untuk animasi keluar modal submitting // Effect untuk parsing parameter URL saat komponen pertama kali mount

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setParams({ email: p.get("email") || "", id: p.get("id") || "" });
  }, []); // Dependency array kosong agar hanya berjalan sekali saat mount // Effect untuk mengelola timer ujian

  useEffect(() => {
    clearInterval(countdownIntervalRef.current); // Bersihkan interval sebelumnya
    if (step === "exam") {
      setTimeLeft(CONFIG.examDuration); // Set waktu awal saat masuk step exam
      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(countdownIntervalRef.current); // Hentikan timer
            submitExam(); // Submit otomatis saat waktu habis
            return 0;
          }
          return t - 1; // Kurangi waktu
        });
      }, 1000); // Update setiap 1 detik
    } // Cleanup function: Hentikan interval saat step berubah atau komponen unmount
    return () => clearInterval(countdownIntervalRef.current);
  }, [step]); // Re-run effect jika 'step' berubah // Effect untuk menampilkan stream di elemen video

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]); // Re-run effect jika 'stream' berubah // --- Tambahan Effect untuk Flags Misuse (Visibility Change) --- // Menggunakan useCallback untuk handler event visibility change

  // --- Tambahan Effect untuk Flags Misuse (Visibility Change) ---
  const handleVisibilityChange = useCallback(() => {
    const eventType = document.hidden ? "tab_hidden" : "tab_visible";
    const details = document.hidden
      ? "User left tab/app"
      : "User returned to tab/app";
    const timestamp = Date.now();

    // console.log(
    //   `Visibility changed: ${details} at ${new Date(timestamp).toISOString()}`
    // ); // Log untuk debug // Hanya catat event jika sedang dalam step 'exam'

    if (step === "exam") {
      misuseEventsRef.current.push({
        type: eventType,
        timestamp: timestamp,
        details: details,
      });
      // console.log(
      //   `Misuse flag recorded: ${eventType} (Total: ${misuseEventsRef.current.length})`
      // );
      // Log jumlah setelah push
    }
  }, [step]); // Re-create handler jika 'step' berubah

  useEffect(() => {
    // Daftarkan event listener menggunakan handler yang di-memo
    document.addEventListener("visibilitychange", handleVisibilityChange);
    // console.log("Visibility change listener added."); // Log untuk debug // Cleanup function: hapus event listener saat komponen unmount atau handler berubah

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // console.log("Visibility change listener removed."); // Log untuk debug
    };
  }, [handleVisibilityChange]); // Re-run effect jika 'handleVisibilityChange' berubah (karena 'step' berubah) // --- Akhir Tambahan Effect untuk Flags Misuse ---
  // Dependency array kosong agar hanya berjalan sekali saat mount // --- Akhir Tambahan Effect untuk Flags Misuse --- // Fungsi helper untuk format detik ke HH:MM:SS
  function formatHMS(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  } // Fungsi untuk memulai ujian: cek auth, minta izin media, generate soal, set step

  async function begin() {
    if (!params.email || !params.id) {
      setAuthError(
        "Anda tidak terautentifikasi. Harap pastikan Anda mengakses halaman ini dengan parameter email dan ID yang valid."
      );
      misuseEventsRef.current.push({
        // Log error autentikasi
        type: "auth_error",
        timestamp: Date.now(),
        details: "Missing email or ID in URL parameters.",
      });
      return; // Mencegah ujian dimulai
    }

    try {
      // Minta izin akses kamera dan mikrofon
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(s); // Simpan stream di state
      const questions = generateQuestions(); // Generate soal
      setQs(questions); // Simpan soal di state
      setStep("exam"); // Pindah ke step exam
      setStartTime(Date.now()); // Catat waktu mulai ujian
      scheduleRecordings(s); // Jadwalkan rekaman video
    } catch (error) {
      console.error("Error getting media devices:", error);
      alert("Izin kamera & mikrofon diperlukan untuk mengikuti ujian ini.");
      misuseEventsRef.current.push({
        // Log error izin media
        type: "media_permission_denied",
        timestamp: Date.now(),
        details: error.message,
      });
    }
  } // Fungsi untuk menyeleksi dan mengacak pertanyaan serta opsi jawabannya

  function generateQuestions() {
    let sel = [];
    for (const [grp, cnt] of Object.entries(CONFIG.groupCounts)) {
      const pool = QUESTION_GROUPS[grp] || []; // Pastikan tidak menyeleksi melebihi jumlah soal yang tersedia
      const questionsToSelect = Math.min(cnt, pool.length); // Acak pool soal per grup sebelum menyeleksi
      const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
      sel.push(...shuffledPool.slice(0, questionsToSelect));
    } // Acak urutan pertanyaan secara keseluruhan setelah seleksi dari semua grup
    const sh = sel.sort(() => 0.5 - Math.random());

    sh.forEach((q) => {
      // Pastikan pertanyaan memiliki opsi dan answerIndex yang valid sebelum diacak opsinya
      if (
        q.options &&
        Array.isArray(q.options) &&
        q.answerIndex != null && // answerIndex ada
        q.answerIndex >= 0 && // answerIndex bukan negatif
        q.answerIndex < q.options.length
      ) {
        // answerIndex dalam rentang opsi
        // --- START: Perbaikan Logika Randomize Opsi ---
        // 1. Ambil referensi ke OBJEK array opsi yang benar SEBELUM diacak
        //    Ini penting karena opsi adalah array of objects [{ base: ..., ruby: ... }]
        const correctOptionObject = q.options[q.answerIndex]; // 2. Acak urutan array opsi (buat salinan agar data asli di QUESTION_GROUPS tidak berubah)

        const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());
        q.options = shuffledOptions; // Ganti array opsi lama dengan yang sudah diacak // 3. Cari INDEKS BARU dari objek opsi yang benar di dalam array yang sudah diacak

        const newAnswerIndex = q.options.indexOf(correctOptionObject); // 4. Perbarui answerIndex dengan indeks yang baru ditemukan

        if (newAnswerIndex !== -1) {
          q.answerIndex = newAnswerIndex;
        } else {
          // Kasus darurat: seharusnya tidak terjadi jika data awal valid dan proses acak benar
          console.error(
            `Error: Jawaban benar (indeks ${q.answerIndex}) tidak ditemukan di opsi setelah pengacakan untuk soal:`,
            q
          );
          q.answerIndex = -1; // Tandai answerIndex tidak valid // Log kesalahan ini sebagai potensi masalah data
          misuseEventsRef.current.push({
            type: "generate_question_error",
            timestamp: Date.now(),
            details: `Correct option object not found after shuffle for q index ${sh.indexOf(
              q
            )}.`,
          });
        } // --- END: Perbaikan Logika Randomize Opsi ---
      } else {
        // Tangani kasus pertanyaan tanpa opsi, opsi bukan array, atau answerIndex tidak valid
        console.warn(
          `Pertanyaan tanpa opsi valid atau answerIndex invalid untuk soal:`,
          q
        );
        q.options = []; // Pastikan opsinya array kosong
        q.answerIndex = -1; // Tandai answerIndex tidak valid // Log kesalahan ini sebagai potensi masalah data
        misuseEventsRef.current.push({
          type: "generate_question_error",
          timestamp: Date.now(),
          details: `Question has no valid options or invalid answerIndex for q index ${sh.indexOf(
            q
          )}.`,
        });
      }
    });

    // console.log("Generated questions:", sh); // Log soal yang dihasilkan untuk debugging
    return sh; // Kembalikan array pertanyaan yang sudah diacak (termasuk opsi dan answerIndex yang sudah diperbarui)
  } // Fungsi untuk menjadwalkan perekaman video secara berkala

  // ==========================================================
  // FUNGSI SCHEDULE RECORDINGS (DENGAN PERUBAHAN DI REC.ONSTOP)
  // ==========================================================
  const scheduleRecordings = useCallback(
    (stream) => {
      console.log("--- Starting scheduleRecordings ---");
      recordingTimeoutsRef.current.forEach(clearTimeout);
      recordingTimeoutsRef.current = [];
      segmentsRef.current = []; // Reset array segmen yang sudah jadi Blob/URL
      recordingPromisesRef.current = []; // <--- PENTING: RESET JUGA ARRAY PROMISE
      chunksRef.current = {};

      const totalSegments = Math.ceil(
        CONFIG.examDuration / CONFIG.recordInterval
      );
      console.log(`Total segments to schedule: ${totalSegments}`);

      for (let i = 0; i < totalSegments; i++) {
        chunksRef.current[i] = [];
        console.log(
          `Initialized chunksRef.current[${i}] = [] for segment ${i + 1}`
        );

        const delayMs = i * CONFIG.recordInterval * 1000;
        console.log(
          `Scheduling start for segment ${i + 1} in ${delayMs / 1000} seconds.`
        );

        const tid = setTimeout(() => {
          console.log(
            `--- Timeout triggered: Starting process for segment ${i + 1} ---`
          );

          try {
            const rec = new MediaRecorder(stream, {
              mimeType: getOptimalMimeType(),
              videoBitsPerSecond: 170000,
            });

            const currentMimeType = rec.mimeType;
            console.log(
              `[Client] MediaRecorder created for segment ${
                i + 1
              }. MimeType selected: ${currentMimeType}. Initial state: ${
                rec.state
              }`
            );

            rec.ondataavailable = (e) => {
              console.log(
                `[Client] ondataavailable fired for segment ${
                  i + 1
                }. Data size: ${
                  e.data ? e.data.size : "null/undefined"
                }. Recorder state: ${rec.state}`
              );
              if (e.data && e.data.size > 0) {
                if (!chunksRef.current[i]) {
                  console.error(
                    `[Client] chunksRef.current[${i}] was null/undefined in ondataavailable for segment ${
                      i + 1
                    }. Re-initializing.`
                  );
                  chunksRef.current[i] = [];
                }
                chunksRef.current[i].push(e.data);
                console.log(
                  `[Client] Pushed chunk to segment ${
                    i + 1
                  }. Total chunks collected: ${
                    chunksRef.current[i].length
                  }. Total size: ${chunksRef.current[i].reduce(
                    (acc, chunk) => acc + chunk.size,
                    0
                  )} bytes.`
                );
              } else {
                console.warn(
                  `[Client] ondataavailable fired for segment ${
                    i + 1
                  } with empty data (e.data.size was 0).`
                );
              }
            };

            recorderRef.current = rec;
            console.log(`[Client] Recorder ref updated for segment ${i + 1}.`);

            // ==========================================================
            // PERUBAHAN KRUSIAL DI REC.ONSTOP UNTUK MENYIMPAN PROMISE
            // ==========================================================
            // --- PERUBAHAN KRUSIAL DI REC.ONSTOP ---
            rec.onstop = async () => {
              console.log(`[Client] Event onstop fired for segment ${i + 1}.`);

              let uploadPromise; // Deklarasikan di sini

              if (chunksRef.current[i] && chunksRef.current[i].length > 0) {
                const blob = new Blob(chunksRef.current[i], {
                  type: currentMimeType.split(";")[0],
                });
                // Panggil fungsi upload yang baru
                uploadPromise = (async () => {
                  try {
                    const videoUrl = await uploadSegmentThroughProxy(
                      // Pastikan nama fungsi sesuai
                      blob,
                      i,
                      currentMimeType.split(";")[0] // Kirim mimeType tanpa 'codecs' jika perlu
                    );
                    segmentsRef.current[i] = videoUrl;
                    console.log(
                      `[Client] Segment ${
                        i + 1
                      } successfully processed and URL stored.`
                    );
                    return { status: "fulfilled", value: videoUrl, index: i };
                  } catch (error) {
                    console.error(
                      `[Client] Failed to upload segment ${
                        i + 1
                      } to Vercel Blob:`,
                      error
                    );
                    const errorInfo = {
                      status: "failed",
                      error: error.message,
                    };
                    segmentsRef.current[i] = errorInfo;
                    // ... (penanganan misuseEventsRef)
                    return { status: "rejected", reason: error, index: i };
                  } finally {
                    delete chunksRef.current[i];
                  }
                })();
              } else {
                console.warn(
                  `[Client] No chunks recorded for segment ${i + 1}.`
                );
                const emptyInfo = {
                  status: "empty",
                  type: currentMimeType.split(";")[0],
                };
                segmentsRef.current[i] = emptyInfo;
                misuseEventsRef.current.push({
                  type: "empty_video_segment_scheduled",
                  timestamp: Date.now(),
                  details: `Scheduled segment ${i} resulted in no chunks.`,
                });
                delete chunksRef.current[i];
                uploadPromise = Promise.resolve({
                  status: "fulfilled",
                  value: "EMPTY_SEGMENT",
                  index: i,
                });
              }

              // Simpan promise ini ke recordingPromisesRef.current[i]
              recordingPromisesRef.current[i] = uploadPromise;
              console.log(
                `[Client] Added promise for segment ${
                  i + 1
                } to recordingPromisesRef.`
              );

              console.log(`--- Finished process for segment ${i + 1} ---`);
            };
            // ... (sisa kode rec.onerror dan setTimeout untuk stop)
            rec.onerror = (event) => {
              console.error(
                `[Client] MediaRecorder error on segment ${i + 1}:`,
                event.error
              );
              misuseEventsRef.current.push({
                type: "recorder_error",
                timestamp: Date.now(),
                details: `Segment ${i}: ${event.error.message}`,
              });
            };

            rec.start();
            console.log(
              `[Client] MediaRecorder started for segment ${
                i + 1
              }. State after start(): ${rec.state}`
            );

            const stopDelayMs = CONFIG.recordDuration * 1000;
            console.log(
              `[Client] Scheduling stop for segment ${i + 1} in ${
                stopDelayMs / 1000
              } seconds.`
            );

            setTimeout(() => {
              console.log(
                `[Client] Scheduled stop timeout triggered for segment ${
                  i + 1
                }. Current recorder state: ${rec.state}.`
              );
              if (rec.state !== "inactive") {
                rec.stop();
                console.log(`[Client] Called rec.stop() for segment ${i + 1}.`);
              } else {
                console.log(
                  `[Client] Scheduled stop called for segment ${
                    i + 1
                  }, but recorder was already inactive.`
                );
              }
            }, stopDelayMs);
          } catch (error) {
            console.error(
              `[Client] FATAL Error during scheduled recording setup for segment ${
                i + 1
              }:`,
              error
            );
            misuseEventsRef.current.push({
              type: "recorder_scheduled_init_error",
              timestamp: Date.now(),
              details: `Segment ${i} scheduling/init failed: ${error.message}`,
            });
            segmentsRef.current[i] = {
              status: "init_failed",
              error: error.message,
              type: getOptimalMimeType().split(";")[0],
            };
            // Penting: Jika setup gagal, pastikan ada Promise yang di-resolve agar Promise.allSettled tidak tergantung pada segmen ini selamanya
            recordingPromisesRef.current[i] = Promise.resolve({
              status: "failed_init",
              reason: error,
              index: i,
            });
            console.log(
              `[Client] Stored error state for segment ${
                i + 1
              } due to setup failure.`
            );
          }
        }, delayMs);

        recordingTimeoutsRef.current.push(tid);
      }
      console.log(
        `--- Finished scheduling all ${totalSegments} recording segments. ---`
      );
    },
    [stream]
  );

  // async function submitExam() {
  //   clearInterval(countdownIntervalRef.current);
  //   recordingTimeoutsRef.current.forEach(clearTimeout);
  //   recordingTimeoutsRef.current = []; // Clear the array

  //   if (recorderRef.current && recorderRef.current.state !== "inactive") {
  //     try {
  //       await new Promise((resolve, reject) => {
  //         const currentRecorder = recorderRef.current;
  //         if (!currentRecorder) {
  //           console.warn("Recorder ref is null during stop attempt promise.");
  //           return resolve();
  //         }

  //         const onStopHandler = () => {
  //           currentRecorder.removeEventListener("stop", onStopHandler);
  //           currentRecorder.removeEventListener("error", onErrorHandler);
  //           resolve();
  //         };

  //         const onErrorHandler = (event) => {
  //           console.error("Recorder error during stop:", event);
  //           currentRecorder.removeEventListener("stop", onStopHandler);
  //           currentRecorder.removeEventListener("error", onErrorHandler);
  //           reject(
  //             new Error(
  //               `Recorder error during stop: ${
  //                 event.error ? event.error.name : "Unknown"
  //               }`
  //             )
  //           );
  //           misuseEventsRef.current.push({
  //             type: "recorder_stop_error_event",
  //             timestamp: Date.now(),
  //             details: `Recorder error event during stop: ${
  //               event.error ? event.error.message : "Unknown Error"
  //             }`,
  //           });
  //         };

  //         currentRecorder.addEventListener("stop", onStopHandler);
  //         currentRecorder.addEventListener("error", onErrorHandler);

  //         currentRecorder.stop();
  //       });
  //     } catch (error) {
  //       console.error("Error during recorder stop process promise:", error);
  //       misuseEventsRef.current.push({
  //         type: "recorder_stop_promise_rejected",
  //         timestamp: Date.now(),
  //         details: `Error awaiting recorder stop: ${error.message}`,
  //       });
  //     }
  //   } else {
  //     console.log("No active recorder to stop. Proceeding directly.");
  //   }

  //   if (stream) {
  //     stream.getTracks().forEach((track) => {
  //       try {
  //         track.stop();
  //       } catch (error) {
  //         console.error("Error stopping stream track:", error);
  //         misuseEventsRef.current.push({
  //           type: "stop_stream_error",
  //           timestamp: Date.now(),
  //           details: error.message,
  //         });
  //       }
  //     });
  //     setStream(null);
  //   }

  //   // --- BAGIAN BARU: Tunggu SEMUA unggahan segmen selesai ---
  //   console.log("[Client] Waiting for all segment uploads to complete...");
  //   await Promise.allSettled(recordingPromisesRef.current);
  //   console.log("[Client] All segment upload promises settled.");
  //   // --- END BAGIAN BARU ---

  //   const end = Date.now();
  //   setSubmitTime(end);
  //   setElapsed(end - (startTime || end));

  //   // --- START PERUBAHAN PENTING DI SINI ---
  //   const videoUrls = segmentsRef.current
  //     .map((item) => {
  //       // Pastikan hanya URL string yang valid yang diambil
  //       if (typeof item === "string" && item.startsWith("http")) {
  //         return item;
  //       }
  //       // Jika item adalah objek error/status, atau null, abaikan atau beri placeholder
  //       if (item && typeof item === "object" && item.status === "failed") {
  //         console.warn(`[Client] Skipping failed segment: ${item.error}`);
  //         return `UPLOAD_FAILED: ${item.error}`; // Atau abaikan dengan return null
  //       }
  //       if (item && typeof item === "object" && item.status === "empty") {
  //         console.warn(`[Client] Skipping empty segment.`);
  //         return `EMPTY_SEGMENT`; // Atau abaikan dengan return null
  //       }
  //       console.warn(`[Client] Unexpected item in segmentsRef.current:`, item);
  //       return null; // Abaikan item yang tidak valid
  //     })
  //     .filter(Boolean); // Menghapus semua nilai null dari array

  //   console.log("[Client] Final video URLs to send to submitExam:", videoUrls);
  //   // --- END PERUBAHAN PENTING DI SINI ---

  //   // ... (kode untuk menghitung skor dan menyiapkan respons tetap sama)

  //   const questionsCount =
  //     qs.length > 0
  //       ? qs.length
  //       : Object.values(CONFIG.groupCounts).reduce(
  //           (sum, count) => sum + count,
  //           0
  //         );
  //   const correctAnswers = qs.filter((q, i) => ans[i] === q.answerIndex).length;
  //   const score =
  //     questionsCount > 0
  //       ? Math.round((correctAnswers / questionsCount) * 100)
  //       : 0;

  //   const responses = qs.map((q, i) => {
  //     const userAnswerIndex = ans[i];
  //     const correctAnswerIndex = q.answerIndex;
  //     const questionText = Array.isArray(q.q)
  //       ? q.q.map((s) => s.base).join("")
  //       : q.q;
  //     const userAnswerText =
  //       userAnswerIndex != null && q.options?.[userAnswerIndex] != null
  //         ? Array.isArray(q.options[userAnswerIndex])
  //           ? q.options[userAnswerIndex].map((s) => s.base).join("")
  //           : q.options[userAnswerIndex]
  //         : "Tidak dijawab";

  //     const correctAnswerText =
  //       correctAnswerIndex != null && q.options?.[correctAnswerIndex] != null
  //         ? Array.isArray(q.options[correctAnswerIndex])
  //           ? q.options[correctAnswerIndex].map((s) => s.base).join("")
  //           : q.options[correctAnswerIndex]
  //         : "N/A";

  //     return {
  //       question: questionText,
  //       answerIndex: userAnswerIndex != null ? userAnswerIndex : null,
  //       answerText: userAnswerText,
  //       correctAnswerIndex:
  //         correctAnswerIndex != null ? correctAnswerIndex : null,
  //       correctAnswerText: correctAnswerText,
  //       isCorrect: userAnswerIndex === correctAnswerIndex,
  //     };
  //   });

  //   try {
  //     const submitRes = await fetch("/api/submitExam", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         email: params.email,
  //         id: params.id,
  //         score,
  //         submitTime: new Date(end).toLocaleString(),
  //         elapsed: Math.floor((end - (startTime || end)) / 1000),
  //         responses,
  //         flags: misuseEventsRef.current,
  //         videoUrls, // Ini akan berisi URL Google Drive yang sudah dikumpulkan
  //       }),
  //     });

  //     if (!submitRes.ok) {
  //       const errorText = await submitRes.text();
  //       throw new Error(
  //         `Submit failed with status: ${submitRes.status}. Response: ${errorText}`
  //       );
  //     }
  //   } catch (error) {
  //     console.error("Error submitting exam data:", error);
  //     alert(
  //       "Gagal mengirim data ujian secara lengkap. Harap hubungi administrator jika masalah berlanjut."
  //     );
  //     misuseEventsRef.current.push({
  //       type: "submit_error",
  //       timestamp: Date.now(),
  //       details: `Final submit failed: ${error.message}`,
  //     });
  //   } finally {
  //     setIsClosingSubmitting(true);
  //     setTimeout(() => {
  //       setIsSubmitting(false);
  //       setStep("result");
  //     }, 300);
  //   }
  // }

  // Handler untuk memunculkan modal konfirmasi submit (dipanggil dari ExamScreen)
  // ==========================================================
  // FUNGSI SUBMIT EXAM (REVISI LENGKAP)
  // ==========================================================

  async function submitExam() {
    clearInterval(countdownIntervalRef.current);
    recordingTimeoutsRef.current.forEach(clearTimeout);
    recordingTimeoutsRef.current = []; // Clear the array

    // --- Bagian untuk menunggu recorder terakhir stop ---
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      console.log("[Client] Stopping the last active recorder...");
      try {
        await new Promise((resolve, reject) => {
          const currentRecorder = recorderRef.current;
          if (!currentRecorder) {
            console.warn("Recorder ref is null during stop attempt promise.");
            return resolve();
          }

          const onStopHandler = () => {
            console.log(
              "[Client] Recorder's onstop handler for last segment fired."
            );
            currentRecorder.removeEventListener("stop", onStopHandler);
            currentRecorder.removeEventListener("error", onErrorHandler);
            // Setelah onstop handler selesai, baru resolve promise ini
            resolve();
          };

          const onErrorHandler = (event) => {
            console.error("Recorder error during stop:", event);
            currentRecorder.removeEventListener("stop", onStopHandler);
            currentRecorder.removeEventListener("error", onErrorHandler);
            reject(
              new Error(
                `Recorder error during stop: ${
                  event.error ? event.error.name : "Unknown"
                }`
              )
            );
            misuseEventsRef.current.push({
              type: "recorder_stop_error_event",
              timestamp: Date.now(),
              details: `Recorder error event during stop: ${
                event.error ? event.error.message : "Unknown Error"
              }`,
            });
          };

          currentRecorder.addEventListener("stop", onStopHandler);
          currentRecorder.addEventListener("error", onErrorHandler);

          currentRecorder.stop();
          // recorderRef.current.stop() akan memicu onstop yang sudah kita definisikan.
          // onstop itu akan menambahkan promise ke recordingPromisesRef.current.
          // Kita perlu mendapatkan promise itu dan menunggunya SECARA EKSPLISIT.

          // Ini adalah triknya: Ambil index dari segmen yang baru saja di-stop.
          // Jika Anda tidak memiliki index yang disimpan di recorderRef, ini bisa jadi sulit.
          // Asumsi: recorderRef.current adalah recorder untuk segmen terakhir yang aktif.
          // Biasanya, index terakhir adalah recordingPromisesRef.current.length - 1
          // Namun, lebih aman jika kita pastikan indexnya sudah tersedia di recorderRef atau closure.
          // Atau, kita bisa membuat mekanisme onstop mengembalikan promise.

          // Opsi paling sederhana: Coba ambil promise untuk segmen terakhir setelah stop dipicu.
          // Ini masih berpotensi race condition jika onstop belum sempat memicu promise.
          // Solusi yang lebih kuat adalah memastikan onstop langsung di-await di dalam sini.
          // Tapi itu berarti mengubah arsitektur onstop secara signifikan.

          // Mari kita coba solusi yang lebih aman dengan `await`ing promise `onstop` yang ada.
          // Masalahnya adalah `onstop` itu asinkron dan tidak mengembalikan promise.
          // Jadi, kita harus mengubah `onstop` agar mengembalikan promise, atau membuat
          // sebuah `Deferred` promise yang bisa di-resolve dari dalam `onstop`.

          // Pendekatan yang lebih bersih dan sesuai dengan struktur Anda:
          // Kita akan mempercayai `onstop` untuk menambahkan promise ke `recordingPromisesRef`.
          // Jadi, kita hanya perlu menunggu `onstop` itu selesai di trigger, lalu baru menunggu
          // `Promise.allSettled`.
        });
        console.log(
          "[Client] Last active recorder has successfully stopped and its onstop logic completed."
        );
      } catch (error) {
        console.error("Error during recorder stop process promise:", error);
        misuseEventsRef.current.push({
          type: "recorder_stop_promise_rejected",
          timestamp: Date.now(),
          details: `Error awaiting recorder stop: ${error.message}`,
        });
      }
    } else {
      console.log("No active recorder to stop. Proceeding directly.");
    }

    // ==========================================================
    // PENTING: Tunggu SEMUA unggahan segmen selesai
    // Sekarang, setelah *semua* `onstop` (termasuk yang terakhir) selesai dipicu
    // dan promise-nya ditambahkan ke `recordingPromisesRef.current`,
    // barulah kita bisa menunggu `Promise.allSettled`.
    // ==========================================================
    console.log("[Client] Waiting for all segment uploads to complete...");
    const validPromises = recordingPromisesRef.current.filter(
      (p) => p instanceof Promise
    );
    if (validPromises.length === 0) {
      console.warn("[Client] No valid recording promises found to await.");
    } else {
      await Promise.allSettled(validPromises);
      console.log("[Client] All segment upload promises settled.");
    }
    // ==========================================================

    // --- Matikan stream kamera (ini juga perlu diperiksa lagi) ---
    if (stream) {
      console.log("[Client] Stopping camera stream tracks.");
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
          console.log(`[Client] Stopped track: ${track.kind}`);
        } catch (error) {
          console.error("Error stopping stream track:", error);
          misuseEventsRef.current.push({
            type: "stop_stream_error",
            timestamp: Date.now(),
            details: error.message,
          });
        }
      });
      setStream(null);
      console.log("[Client] Stream set to null.");
    } else {
      console.log("[Client] No active stream to stop.");
    }

    // ==========================================================
    // PERUBAHAN KRUSIAL DI SINI: MENUNGGU SEMUA PROMISE SEGMEN SELESAI
    // ==========================================================
    console.log("[Client] Waiting for all segment uploads to complete...");
    // Gunakan Promise.allSettled untuk menunggu semua janji selesai (berhasil atau gagal)
    await Promise.allSettled(recordingPromisesRef.current);
    console.log("[Client] All segment upload promises settled.");
    // ==========================================================

    const end = Date.now();
    setSubmitTime(end);
    setElapsed(end - (startTime || end));

    // ==========================================================
    // KUMPULKAN VIDEO URLS DARI SEGMENTREF.CURRENT SETELAH SEMUA UNGGAHAN SELESAI
    // ==========================================================
    const videoUrls = segmentsRef.current
      .map((item) => {
        if (typeof item === "string" && item.startsWith("http")) {
          return item; // Ini adalah URL yang berhasil diunggah
        }
        // Jika item adalah objek status error atau kosong
        if (item && typeof item === "object") {
          if (item.status === "failed") {
            console.warn(`[Client] Skipping failed segment: ${item.error}`);
            return `UPLOAD_FAILED: ${item.error}`; // Indikasi kegagalan
          }
          if (item.status === "empty") {
            console.warn(`[Client] Skipping empty segment.`);
            return `EMPTY_SEGMENT`; // Indikasi segmen kosong
          }
          if (item.status === "init_failed") {
            console.warn(
              `[Client] Skipping segment due to init failure: ${item.error}`
            );
            return `INIT_FAILED: ${item.error}`; // Indikasi kegagalan inisialisasi
          }
        }
        console.warn(`[Client] Unexpected item in segmentsRef.current:`, item);
        return null; // Abaikan item yang tidak valid/tidak dikenal
      })
      .filter(Boolean); // Menghapus semua nilai null dari array

    console.log("[Client] Final video URLs to send to submitExam:", videoUrls);
    // ==========================================================

    // Hitung skor
    const questionsCount =
      qs.length > 0
        ? qs.length
        : Object.values(CONFIG.groupCounts).reduce(
            (sum, count) => sum + count,
            0
          );
    const correctAnswers = qs.filter((q, i) => ans[i] === q.answerIndex).length;
    const score =
      questionsCount > 0
        ? Math.round((correctAnswers / questionsCount) * 100)
        : 0;

    // Siapkan data respons detail per soal
    const responses = qs.map((q, i) => {
      const userAnswerIndex = ans[i];
      const correctAnswerIndex = q.answerIndex;
      const questionText = Array.isArray(q.q)
        ? q.q.map((s) => s.base).join("")
        : q.q;
      const userAnswerText =
        userAnswerIndex != null && q.options?.[userAnswerIndex] != null
          ? Array.isArray(q.options[userAnswerIndex])
            ? q.options[userAnswerIndex].map((s) => s.base).join("")
            : q.options[userAnswerIndex]
          : "Tidak dijawab";

      const correctAnswerText =
        correctAnswerIndex != null && q.options?.[correctAnswerIndex] != null
          ? Array.isArray(q.options[correctAnswerIndex])
            ? q.options[correctAnswerIndex].map((s) => s.base).join("")
            : q.options[correctAnswerIndex]
          : "N/A";

      return {
        question: questionText,
        answerIndex: userAnswerIndex != null ? userAnswerIndex : null,
        answerText: userAnswerText,
        correctAnswerIndex:
          correctAnswerIndex != null ? correctAnswerIndex : null,
        correctAnswerText: correctAnswerText,
        isCorrect: userAnswerIndex === correctAnswerIndex,
      };
    });

    try {
      const submitRes = await fetch("/api/submitExam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: params.email,
          id: params.id,
          score,
          submitTime: new Date(end).toLocaleString(),
          elapsed: Math.floor((end - (startTime || end)) / 1000),
          responses,
          flags: misuseEventsRef.current,
          videoUrls, // Ini akan berisi URL Google Drive yang sudah dikumpulkan
        }),
      });

      if (!submitRes.ok) {
        const errorText = await submitRes.text();
        throw new Error(
          `Submit failed with status: ${submitRes.status}. Response: ${errorText}`
        );
      }
      console.log("[Client] Exam data submitted successfully.");
    } catch (error) {
      console.error("Error submitting exam data:", error);
      alert(
        "Gagal mengirim data ujian secara lengkap. Harap hubungi administrator jika masalah berlanjut."
      );
      misuseEventsRef.current.push({
        type: "submit_error",
        timestamp: Date.now(),
        details: `Final submit failed: ${error.message}`,
      });
    } finally {
      setIsClosingSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setStep("result");
      }, 300);
    }
  }

  // --- Anda mungkin punya useEffect untuk start kamera, dll. di sini ---
  useEffect(() => {
    // Contoh untuk memulai kamera saat komponen dimuat
    const getMedia = async () => {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(userStream);
        // Jika Anda ingin langsung memulai perekaman saat stream tersedia
        // scheduleRecordings(userStream);
      } catch (err) {
        console.error("Error accessing media devices:", err);
        misuseEventsRef.current.push({
          type: "media_access_denied",
          timestamp: Date.now(),
          details: err.message,
        });
      }
    };
    if (!stream) {
      getMedia();
    }

    return () => {
      // Cleanup: hentikan semua timeout dan stream saat komponen unmount
      recordingTimeoutsRef.current.forEach(clearTimeout);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream, scheduleRecordings]); // scheduleRecordings perlu di deps jika pakai useCallback

  const handleInitiateSubmit = () => {
    setIsConfirmSubmitModalOpen(true);
  }; // Handler untuk tombol 'Tidak' di modal konfirmasi

  const closeConfirmModal = () => {
    setIsClosingConfirm(true); // Picu animasi keluar
    setTimeout(() => {
      setIsConfirmSubmitModalOpen(false); // Sembunyikan modal setelah animasi
      setIsClosingConfirm(false); // Reset state closing
    }, 300); // Durasi animasi
  }; // Handler untuk tombol 'Ya' di modal konfirmasi

  const handleConfirmSubmit = () => {
    // Mulai animasi keluar untuk modal konfirmasi
    setIsClosingConfirm(true); // Segera tampilkan modal submitting (akan teranimasi masuk)
    setIsSubmitting(true); // Tunggu animasi keluar modal konfirmasi selesai sebelum melanjutkan ke submitExam

    setTimeout(() => {
      setIsConfirmSubmitModalOpen(false); // Sembunyikan modal konfirmasi
      setIsClosingConfirm(false); // Reset state closing
      submitExam(); // Panggil fungsi utama submit
    }, 300); // Sesuaikan durasi timeout dengan durasi animasi CSS
  }; // Hitung skor akhir (nilai terhitung)

  const finalScore = Math.round(
    (qs.filter((q, i) => ans[i] === q.answerIndex).length / (qs.length || 1)) * // Handle qs.length 0
      100
  ); // Handler untuk checkbox persetujuan di IntroScreen

  const agreeCheck = (event) => {
    setIsAgreed(event.target.checked);
  }; // Handler untuk membuka modal peta soal

  const openQuestionMapModal = () => {
    setIsQuestionMapModalOpen(true);
  }; // Handler untuk menutup modal peta soal

  const closeQuestionMapModal = () => {
    setIsClosingQuestionMap(true); // Picu animasi keluar
    setTimeout(() => {
      setIsQuestionMapModalOpen(false); // Sembunyikan modal setelah animasi
      setIsClosingQuestionMap(false); // Reset state closing
    }, 300); // Durasi animasi
  }; // Handler untuk menutup modal auth error

  const closeAuthErrorModal = () => {
    setIsClosingAuthError(true); // Picu animasi keluar
    setTimeout(() => {
      setAuthError(null); // Sembunyikan modal (set state null) setelah animasi
      setIsClosingAuthError(false); // Reset state closing
    }, 300); // Durasi animasi
  }; // Handler untuk tombol "Ulangi Ujian" di ResultScreen

  const handleRetryExam = () => {
    // console.log("Mereset ujian..."); // Log proses reset // Reset semua state dan refs kembali ke nilai awal
    setStep("intro"); // Kembali ke step intro
    setQs([]); // Kosongkan soal
    setAns({}); // Kosongkan jawaban
    setCur(0); // Kembali ke soal pertama
    setTimeLeft(CONFIG.examDuration); // Reset waktu
    setIsSubmitting(false); // Pastikan tidak dalam status submitting
    setStartTime(null); // Reset waktu mulai
    setSubmitTime(null); // Reset waktu submit
    setElapsed(null); // Reset durasi
    setIsAgreed(false); // Reset persetujuan // Hentikan stream media jika masih aktif

    if (stream) {
      // console.log("Stopping media stream on retry...");
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error("Error stopping track on retry:", e);
        }
      });
      setStream(null); // Clear stream state
    } // Bersihkan interval dan timeout rekaman

    clearInterval(countdownIntervalRef.current); // Hentikan timer
    recordingTimeoutsRef.current.forEach(clearTimeout); // Bersihkan timeout
    recordingTimeoutsRef.current = []; // Reset array timeout // Hentikan recorder jika masih aktif

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      // console.log("Stopping active recorder on retry...");
      try {
        recorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping recorder on retry:", e);
      }
    } // Reset data rekaman dan flags misuse

    segmentsRef.current = [];
    chunksRef.current = {};
    misuseEventsRef.current = []; // Reset flags // Reset state penutup modal jika ada yang masih true

    setIsClosingAuthError(false);
    setIsClosingQuestionMap(false);
    setIsConfirmSubmitModalOpen(false);
    setIsClosingConfirm(false);
    setIsClosingSubmitting(false); // Anda mungkin ingin secara eksplisit memanggil generateQuestions() di sini // jika generateQuestions tidak otomatis dipanggil di begin() // Namun, karena begin() dipanggil saat user klik "Mulai" setelah retry, // pemanggilan generateQuestions() di dalam begin() sudah cukup. // generateQuestions(); // Optional: panggil di sini jika perlu refresh soal sebelum begin
  };
  return (
    <div className="w-full flex justify-center min-h-screen py-12 bg-slate-200 select-none relative overflow-hidden overscroll-none">
      <SubmittingModal isOpen={isSubmitting} isClosing={isClosingSubmitting} /> 
      <AuthErrorModal
        isOpen={!!authError} // Tampilkan jika authError punya nilai
        errorMessage={authError} // Lewatkan pesan error
        isClosing={isClosingAuthError} // Lewatkan state closing
        onClose={closeAuthErrorModal} // Lewatkan handler tutup
      />
      <QuestionMapModal
        isOpen={isQuestionMapModalOpen} // Tampilkan jika modal buka
        isClosing={isClosingQuestionMap} // Lewatkan state closing
        onClose={closeQuestionMapModal} // Lewatkan handler tutup
        qs={qs} // Lewatkan data soal
        ans={ans} // Lewatkan jawaban user
        cur={cur} // Lewatkan index soal saat ini
        setCur={setCur} // Lewatkan setter index soal (untuk navigasi dari map)
      />
      <ConfirmSubmitModal
        isOpen={isConfirmSubmitModalOpen} // Tampilkan jika modal buka
        isClosing={isClosingConfirm} // Lewatkan state closing
        onCancel={closeConfirmModal} // Lewatkan handler batal
        onConfirm={handleConfirmSubmit} // Lewatkan handler konfirmasi
      />
      {step === "intro" && (
        <IntroScreen
          isAgreed={isAgreed} // Lewatkan state persetujuan
          onAgreeChange={agreeCheck} // Lewatkan handler perubahan checkbox
          onStartExam={begin} // Lewatkan handler mulai ujian
          config={CONFIG} // Lewatkan objek konfigurasi // authError tidak dilewatkan karena AuthErrorModal berdiri sendiri
        />
      )}
      {step === "exam" && (
        <ExamScreen
          qs={qs} // Lewatkan data soal
          ans={ans} // Lewatkan jawaban user
          setAns={setAns} // Lewatkan setter jawaban
          cur={cur} // Lewatkan index soal saat ini
          setCur={setCur} // Lewatkan setter index soal
          timeLeft={timeLeft} // Lewatkan waktu tersisa
          progress={progress} // Lewatkan progress bar
          videoRef={videoRef} // Lewatkan ref elemen video // stream={stream} // Stream tidak perlu dilewatkan ke ExamScreen, hanya videoRef yang butuh
          recorderState={recorderRef.current?.state} // Lewatkan state recorder
          renderRubySegment={renderRubySegment} // Lewatkan fungsi helper
          openQuestionMapModal={openQuestionMapModal} // Lewatkan handler buka map
          onInitiateSubmit={handleInitiateSubmit} // Lewatkan handler submit
          formatHMS={formatHMS} // Lewatkan fungsi helper format waktu
          totalQuestions={qs.length} // Lewatkan total soal
        />
      )}
      {step === "result" && (
        <ResultScreen
          finalScore={finalScore} // Lewatkan skor akhir
          submitTime={submitTime} // Lewatkan waktu submit
          elapsed={elapsed} // Lewatkan durasi
          formatHMS={formatHMS} // Lewatkan fungsi helper format waktu
          onRetry={handleRetryExam} // Lewatkan handler retry
        />
      )}
    </div>
  );
}
