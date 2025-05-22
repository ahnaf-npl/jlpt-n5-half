// pages/index.js
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  recordDuration: 180, // record 3 minutes each
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

// Fungsi helper untuk merender ruby
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
    // console.log("Using video/mp4 for iOS device.");
    return "video/mp4";
  } else if (MediaRecorder.isTypeSupported("video/webm; codecs=vp8")) {
    // console.log("Using video/webm; codecs=vp8.");
    return "video/webm; codecs=vp8";
  } else if (MediaRecorder.isTypeSupported("video/webm")) {
    // console.log("Using video/webm (generic).");
    return "video/webm";
  }
  console.warn(
    "No specific MediaRecorder mimeType supported. Defaulting to video/webm."
  );
  return "video/webm";
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
  }, []);

  // Effect untuk mengelola timer ujian
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
  }, [step]); // Re-run effect jika 'step' berubah

  useEffect(() => {
    // Saat step berubah, jika bukan 'exam', hentikan kamera
    if (step !== "exam" && stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [step]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]); // Re-run effect jika 'stream' berubah

  // Handler untuk merekam tab-hidden event saja
  const handleVisibilityChange = useCallback(() => {
    if (step !== "exam") return; // hanya saat exam
    if (!document.hidden) return; // abaikan saat kembali ke tab

    const timestamp = Date.now();
    // Hitung selisih sejak startTime dalam detik
    const elapsedSec = startTime
      ? Math.floor((timestamp - startTime) / 1000)
      : 0;
    // Format jadi "HH:MM:SS"
    const relativeHMS = formatHMS(elapsedSec);

    misuseEventsRef.current.push({
      type: "tab_hidden",
      timestamp,
      details: `[${relativeHMS}]　注意！　ユーザーはタブ/アプリを移動しました。`,
    });
  }, [step, startTime, formatHMS]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleVisibilityChange]);

  // Fungsi helper untuk format detik ke HH:MM:SS
  function formatHMS(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  // Fungsi untuk memulai ujian: cek auth, minta izin media, generate soal, set step
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
  }

  // Fungsi upload per segmen, pakai email dari params
  const uploadSegmentThroughProxy = useCallback(async (blob, segmentIndex) => {
    let email = params.email;
    // Fallback: baca langsung dari URL jika belum ter-set
    if (!email) {
      const p = new URLSearchParams(window.location.search);
      email = p.get("email") || "";
    }
    if (!email) {
      throw new Error("Missing user email");
    }

    const filename = `segment_${segmentIndex + 1}_${Date.now()}.webm`;
    const form = new FormData();
    form.append("video", blob, filename);
    form.append("id", params.id);

    const res = await fetch("/api/upload-segment", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    const { videoUrl } = await res.json(); // "/videos/…"
    const fullUrl = `${window.location.origin}${videoUrl}`;
    return fullUrl; // "https://your-domain.com/videos/…"
  }, []);

  // Fungsi untuk menyeleksi dan mengacak pertanyaan serta opsi jawabannya
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
        // 1. Ambil referensi ke OBJEK array opsi yang benar SEBELUM diacak
        const correctOptionObject = q.options[q.answerIndex]; // 2. Acak urutan array opsi (buat salinan agar data asli di QUESTION_GROUPS tidak berubah)

        const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());
        q.options = shuffledOptions; // 3. Cari INDEKS BARU dari objek opsi yang benar di dalam array yang sudah diacak

        const newAnswerIndex = q.options.indexOf(correctOptionObject); // 4. Perbarui answerIndex dengan indeks yang baru ditemukan

        if (newAnswerIndex !== -1) {
          q.answerIndex = newAnswerIndex;
        } else {
          // Kasus darurat: seharusnya tidak terjadi jika data awal valid dan proses acak benar
          console.error(
            `Error: Jawaban benar (indeks ${q.answerIndex}) tidak ditemukan di opsi setelah pengacakan untuk soal:`,
            q
          );
          q.answerIndex = -1; // Log kesalahan ini sebagai potensi masalah data
          misuseEventsRef.current.push({
            type: "generate_question_error",
            timestamp: Date.now(),
            details: `Correct option object not found after shuffle for q index ${sh.indexOf(
              q
            )}.`,
          });
        }
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
    return sh; // Kembalikan array pertanyaan yang sudah diacak
  }

  // Fungsi untuk menjadwalkan perekaman video secara berkala
  const scheduleRecordings = useCallback(
    (stream) => {
      // console.log("--- Starting scheduleRecordings ---");
      recordingTimeoutsRef.current.forEach(clearTimeout);
      recordingTimeoutsRef.current = [];
      segmentsRef.current = []; // Reset array segmen yang sudah jadi Blob/URL
      recordingPromisesRef.current = [];
      chunksRef.current = {};

      const totalSegments = Math.ceil(
        CONFIG.examDuration / CONFIG.recordInterval
      );
      // console.log(`Total segments to schedule: ${totalSegments}`);

      for (let i = 0; i < totalSegments; i++) {
        chunksRef.current[i] = [];
        // console.log(
        //   `Initialized chunksRef.current[${i}] = [] for segment ${i + 1}`
        // );

        const delayMs = i * CONFIG.recordInterval * 1000;
        // console.log(
        //   `Scheduling start for segment ${i + 1} in ${delayMs / 1000} seconds.`
        // );

        const tid = setTimeout(() => {
          // console.log(
          //   `--- Timeout triggered: Starting process for segment ${i + 1} ---`
          // );

          try {
            const rec = new MediaRecorder(stream, {
              mimeType: getOptimalMimeType(),
              videoBitsPerSecond: 170000,
            });

            const currentMimeType = rec.mimeType;
            // console.log(
            //   `[Client] MediaRecorder created for segment ${
            //     i + 1
            //   }. MimeType selected: ${currentMimeType}. Initial state: ${
            //     rec.state
            //   }`
            // );

            rec.ondataavailable = (e) => {
              // console.log(
              //   `[Client] ondataavailable fired for segment ${
              //     i + 1
              //   }. Data size: ${
              //     e.data ? e.data.size : "null/undefined"
              //   }. Recorder state: ${rec.state}`
              // );
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
                // console.log(
                //   `[Client] Pushed chunk to segment ${
                //     i + 1
                //   }. Total chunks collected: ${
                //     chunksRef.current[i].length
                //   }. Total size: ${chunksRef.current[i].reduce(
                //     (acc, chunk) => acc + chunk.size,
                //     0
                //   )} bytes.`
                // );
              } else {
                console.warn(
                  `[Client] ondataavailable fired for segment ${
                    i + 1
                  } with empty data (e.data.size was 0).`
                );
              }
            };

            recorderRef.current = rec;
            // console.log(`[Client] Recorder ref updated for segment ${i + 1}.`);

            rec.onstop = async () => {
              // console.log(`[Client] Event onstop fired for segment ${i + 1}.`);

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
                    // console.log(
                    //   `[Client] Segment ${
                    //     i + 1
                    //   } successfully processed and URL stored.`
                    // );
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
              // console.log(
              //   `[Client] Added promise for segment ${
              //     i + 1
              //   } to recordingPromisesRef.`
              // );

              // console.log(`--- Finished process for segment ${i + 1} ---`);
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
            // console.log(
            //   `[Client] MediaRecorder started for segment ${
            //     i + 1
            //   }. State after start(): ${rec.state}`
            // );

            const stopDelayMs = CONFIG.recordDuration * 1000;
            // console.log(
            //   `[Client] Scheduling stop for segment ${i + 1} in ${
            //     stopDelayMs / 1000
            //   } seconds.`
            // );

            setTimeout(() => {
              // console.log(
              //   `[Client] Scheduled stop timeout triggered for segment ${
              //     i + 1
              //   }. Current recorder state: ${rec.state}.`
              // );
              if (rec.state !== "inactive") {
                rec.stop();
                // console.log(`[Client] Called rec.stop() for segment ${i + 1}.`);
              } else {
                // console.log(
                //   `[Client] Scheduled stop called for segment ${
                //     i + 1
                //   }, but recorder was already inactive.`
                // );
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
            // console.log(
            //   `[Client] Stored error state for segment ${
            //     i + 1
            //   } due to setup failure.`
            // );
          }
        }, delayMs);

        recordingTimeoutsRef.current.push(tid);
      }
      // console.log(
      //   `--- Finished scheduling all ${totalSegments} recording segments. ---`
      // );
    },
    [stream]
  );

  async function submitExam() {
    clearInterval(countdownIntervalRef.current);
    recordingTimeoutsRef.current.forEach(clearTimeout);
    recordingTimeoutsRef.current = []; // Clear the array

    // --- Bagian untuk menunggu recorder terakhir stop ---
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      // console.log("[Client] Stopping the last active recorder...");
      try {
        await new Promise((resolve, reject) => {
          const currentRecorder = recorderRef.current;
          if (!currentRecorder) {
            console.warn("Recorder ref is null during stop attempt promise.");
            return resolve();
          }

          const onStopHandler = () => {
            // console.log(
            //   "[Client] Recorder's onstop handler for last segment fired."
            // );
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
      // console.log("No active recorder to stop. Proceeding directly.");
    }

    // console.log("[Client] Waiting for all segment uploads to complete...");
    const validPromises = recordingPromisesRef.current.filter(
      (p) => p instanceof Promise
    );
    if (validPromises.length === 0) {
      console.warn("[Client] No valid recording promises found to await.");
    } else {
      await Promise.allSettled(validPromises);
      // console.log("[Client] All segment upload promises settled.");
    }

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
      // console.log("[Client] Stream set to null.");
    } else {
      // console.log("[Client] No active stream to stop.");
    }

    // console.log("[Client] Waiting for all segment uploads to complete...");
    // Gunakan Promise.allSettled untuk menunggu semua janji selesai (berhasil atau gagal)
    await Promise.allSettled(recordingPromisesRef.current);
    // console.log("[Client] All segment upload promises settled.");

    const end = Date.now();
    setSubmitTime(end);
    setElapsed(end - (startTime || end));

    const videoUrls = segmentsRef.current
      .map((item) => {
        // Jika string (URL relatif atau absolut), kembalikan langsung
        if (typeof item === "string") {
          return item;
        }
        // Item objek error atau status: abaikan
        if (item && typeof item === "object") {
          if (item.status === "failed" || item.status === "init_failed") {
            console.warn(`Skipping failed segment: ${item.error}`);
          }
          if (item.status === "empty") {
            console.warn(`Skipping empty segment.`);
          }
          return null;
        }
        // Abaikan tipe yang tidak valid
        return null;
      })
      .filter(Boolean);

    // console.log("[Client] Final video URLs to send to submitExam:", videoUrls);

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
          : "Not Answered";

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
    <div className="w-full flex justify-center items-center min-h-screen bg-slate-200 select-none relative overflow-hidden overscroll-none">
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
