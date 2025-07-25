// pages/index.js

// ========================================================================
// IMPORT LIBRARIES & COMPONENTS
// ========================================================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast"; // Library untuk notifikasi popup (toast)
import QUESTION_GROUPS from "../data/questions"; // Data bank soal

// Komponen-komponen UI modular
import SubmittingModal from "../components/Modals/SubmittingModal";
import AuthErrorModal from "../components/Modals/AuthErrorModal";
import QuestionMapModal from "../components/Modals/QuestionMapModal";
import ConfirmSubmitModal from "../components/Modals/ConfirmSubmitModal";
import IntroScreen from "../components/Screens/IntroScreen";
import ExamScreen from "../components/Screens/ExamScreen";
import ResultScreen from "../components/Screens/ResultScreen";

// ========================================================================
// KONFIGURASI UTAMA APLIKASI
// ========================================================================
/**
 * Objek konfigurasi utama untuk ujian.
 * @property {number} examDuration - Durasi total ujian dalam detik.
 * @property {number} recordInterval - Interval waktu untuk memulai segmen rekaman baru (detik).
 * @property {number} recordDuration - Durasi setiap segmen rekaman video (detik).
 * @property {object} groupCounts - Jumlah soal yang akan diambil dari setiap grup/kategori.
 */
const CONFIG = {
  examDuration: 1800, // 30 menit
  recordInterval: 600, // Rekaman dimulai setiap 10 menit
  recordDuration: 180, // Durasi rekaman adalah 3 menit per segmen
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

// ========================================================================
// FUNGSI HELPER
// ========================================================================
/**
 * Merender segmen teks dengan atau tanpa karakter ruby (furigana).
 * @param {object} seg - Objek segmen berisi 'base' dan 'ruby'.
 * @param {string|number} key - Kunci unik untuk elemen React.
 * @returns {JSX.Element} Elemen JSX yang sesuai.
 */
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

/**
 * Mendeteksi dan memilih tipe MIME video terbaik yang didukung browser untuk MediaRecorder.
 * @returns {string} String tipe MIME yang optimal.
 */
function getOptimalMimeType() {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isIOS && MediaRecorder.isTypeSupported("video/mp4")) {
    // console.log("DEBUG: Using video/mp4 for iOS device.");
    return "video/mp4";
  } else if (MediaRecorder.isTypeSupported("video/webm; codecs=vp8")) {
    // console.log("DEBUG: Using video/webm; codecs=vp8.");
    return "video/webm; codecs=vp8";
  } else if (MediaRecorder.isTypeSupported("video/webm")) {
    // console.log("DEBUG: Using video/webm (generic).");
    return "video/webm";
  }
  console.warn(
    "WARNING: No specific MediaRecorder mimeType supported. Defaulting to video/webm."
  );
  return "video/webm";
}

// ========================================================================
// KOMPONEN UI LOKAL
// ========================================================================
/**
 * Komponen Modal untuk Lock System, meminta pengguna memasukkan kode unik.
 */
function LockModal({
  isOpen,
  isClosing,
  onSubmit,
  uniqueCode,
  setUniqueCode,
  isVerifying,
}) {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/60 flex justify-center items-center z-50 transition-opacity duration-300 ${
        isOpen && !isClosing ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`bg-white rounded-lg shadow-2xl p-6 md:p-8 w-11/12 md:w-1/3 max-w-lg transform transition-transform duration-300 ${
          isOpen && !isClosing ? "scale-100" : "scale-95"
        }`}
      >
        <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-4">
          Akses Ditolak
        </h2>
        <p className="text-gray-700 mb-6">
          Anda sudah pernah mengerjakan tes ini. Anda bisa mencoba lagi nanti
          ketika latihan interview atau mendan. Sensei dari LPK LINK akan
          memberikan kode unik saat itu.
        </p>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            value={uniqueCode}
            onChange={(e) => setUniqueCode(e.target.value)}
            placeholder="Masukkan Kode Unik"
            className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isVerifying}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            disabled={isVerifying || !uniqueCode}
          >
            {isVerifying ? "Memverifikasi..." : "Mulai Ujian"}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Komponen layar penuh yang ditampilkan jika pengguna tidak menggunakan browser yang didukung (Google Chrome).
 */
function UnsupportedBrowserScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-100 text-center p-8">
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Chrome_icon_%28September_2014%29.svg"
        alt="Google Chrome Logo"
        className="w-24 h-24 mb-6"
      />
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Browser Tidak Didukung
      </h1>
      <p className="text-lg text-gray-600 max-w-md">
        Untuk pengalaman terbaik dan memastikan semua fitur berfungsi, harap
        gunakan browser <strong>Google Chrome</strong> untuk mengerjakan tes
        ini.
      </p>
    </div>
  );
}

// ========================================================================
// KOMPONEN UTAMA (HOME)
// ========================================================================
export default function Home() {
  // --- DEKLARASI STATE (useState) ---
  // State utama alur aplikasi
  const [step, setStep] = useState("intro"); // Tahapan aplikasi: "intro", "exam", "result"
  const [qs, setQs] = useState([]); // Array berisi soal-soal ujian
  const [ans, setAns] = useState({}); // Objek berisi jawaban pengguna {soalIndex: jawabanIndex}
  const [cur, setCur] = useState(0); // Index soal yang sedang aktif ditampilkan
  const [timeLeft, setTimeLeft] = useState(CONFIG.examDuration); // Waktu ujian tersisa (detik)
  const [startTime, setStartTime] = useState(null); // Timestamp waktu mulai ujian
  const [elapsed, setElapsed] = useState(null); // Waktu pengerjaan total (ms)
  const [isAgreed, setIsAgreed] = useState(false); // Status persetujuan checkbox di intro
  const [scoreState, setScoreState] = useState(null); // Skor akhir ujian
  const [stream, setStream] = useState(null); // Stream media (kamera & mikrofon)
  const [params, setParams] = useState({ email: "", id: "", tag: "" }); // Parameter dari URL

  // State untuk kontrol UI dan modal
  const [isSubmitting, setIsSubmitting] = useState(false); // Status loading saat submit
  const [isClosingSubmitting, setIsClosingSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null); // Pesan error untuk modal autentikasi
  const [isClosingAuthError, setIsClosingAuthError] = useState(false);
  const [isConfirmSubmitModalOpen, setIsConfirmSubmitModalOpen] =
    useState(false);
  const [isClosingConfirm, setIsClosingConfirm] = useState(false);
  const [isQuestionMapModalOpen, setIsQuestionMapModalOpen] = useState(false);
  const [isClosingQuestionMap, setIsClosingQuestionMap] = useState(false);

  // State untuk Lock System (pembatasan tes)
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isClosingLockModal, setIsClosingLockModal] = useState(false);
  const [uniqueCodeInput, setUniqueCodeInput] = useState(""); // Input kode unik dari pengguna
  const [isVerifying, setIsVerifying] = useState(false); // Status loading saat verifikasi kode

  // State untuk validasi browser
  const [isBrowserSupported, setIsBrowserSupported] = useState(true);

  // State untuk data yang akan dikirim
  const [submitTimeDisplay, setSubmitTimeDisplay] = useState("");
  const [submitTimeForWebhook, setSubmitTimeForWebhook] = useState("");

  // --- DEKLARASI REFS (useRef) ---
  const recorderRef = useRef(null); // Menyimpan instance MediaRecorder
  const videoRef = useRef(null); // Referensi ke elemen <video> di DOM
  const segmentsRef = useRef([]); // Menyimpan URL video segmen yang sudah di-upload
  const chunksRef = useRef({}); // Menyimpan data 'chunk' video sementara sebelum di-blob
  const countdownIntervalRef = useRef(null); // Menyimpan ID dari setInterval timer
  const recordingPromisesRef = useRef([]); // Menyimpan promise dari proses upload segmen
  const recordingTimeoutsRef = useRef([]); // Menyimpan ID dari setTimeout untuk jadwal rekam
  const misuseEventsRef = useRef([]); // Mencatat semua flag pelanggaran (pindah tab, translate, dll)
  const totalTime = useRef(CONFIG.examDuration); // Menyimpan durasi total untuk kalkulasi progress bar
  const submitExamRef = useRef(); // Referensi ke fungsi submitExam agar selalu versi terbaru

  const progress = (timeLeft / totalTime.current) * 100; // Kalkulasi progress bar

  // ========================================================================
  // EFEK & SIDE EFFECTS (useEffect)
  // ========================================================================

  /**
   * [SETUP] Mengambil parameter (email, id, tag) dari URL saat komponen pertama kali dimuat.
   */
  useEffect(() => {
    // console.log("DEBUG: Parsing URL parameters...");
    const p = new URLSearchParams(window.location.search);
    const urlParams = {
      email: p.get("email") || "",
      id: p.get("id") || "",
      tag: p.get("tag") || "",
    };
    setParams(urlParams);
    // console.log("DEBUG: URL parameters set:", urlParams);
  }, []);

  /**
   * [SETUP] Memeriksa browser pengguna saat komponen pertama kali dimuat.
   * Hanya mengizinkan Google Chrome.
   */
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isChrome = userAgent.includes("Chrome") && !userAgent.includes("Edg");
    // console.log(`DEBUG: Browser check: isChrome = ${isChrome}`);
    if (!isChrome) {
      setIsBrowserSupported(false);
    }
  }, []);

  /**
   * [LIFECYCLE] Menyimpan versi terbaru dari fungsi `submitExam` ke dalam ref.
   * Ini untuk memastikan `setInterval` selalu memanggil versi fungsi yang paling update.
   */
  useEffect(() => {
    submitExamRef.current = submitExam;
  }, [submitExam]);

  /**
   * [EXAM] Mengelola timer hitung mundur ujian.
   * Hanya berjalan saat `step` adalah "exam".
   */
  useEffect(() => {
    if (step !== "exam") return;
    // console.log("DEBUG: Exam timer started.");
    setTimeLeft(CONFIG.examDuration);
    const tid = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tid);
          startSubmitFlow(); // Waktu habis, submit otomatis
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    // Cleanup function: membersihkan interval saat komponen unmount atau step berubah
    return () => {
      // console.log("DEBUG: Exam timer cleared.");
      clearInterval(tid);
    };
  }, [step]);

  /**
   * [EXAM] Menampilkan peringatan "Are you sure you want to leave?"
   * saat pengguna mencoba reload atau menutup tab selama ujian.
   */
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = ""; // Diperlukan untuk beberapa browser
    };

    if (step === "exam") {
      window.addEventListener("beforeunload", handleBeforeUnload);
      // console.log("DEBUG: Event listener 'beforeunload' ADDED.");
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // console.log("DEBUG: Event listener 'beforeunload' REMOVED.");
    };
  }, [step]);

  /**
   * [LIFECYCLE] Menghentikan stream kamera & mikrofon jika pengguna meninggalkan halaman ujian.
   */
  useEffect(() => {
    if (step !== "exam" && stream) {
      // console.log("DEBUG: Stopping media stream because step is not 'exam'.");
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [step, stream]);

  /**
   * [LIFECYCLE] Menghubungkan stream media ke elemen <video> di DOM.
   */
  useEffect(() => {
    if (videoRef.current && stream) {
      // console.log("DEBUG: Attaching media stream to video element.");
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  /**
   * [FLAG] Menangani pendeteksian saat pengguna pindah tab/aplikasi (visibility change).
   */
  const handleVisibilityChange = useCallback(() => {
    if (step !== "exam" || !document.hidden) return;

    // console.log("FLAG: User switched tabs.");
    const timestamp = Date.now();
    const elapsedSec = startTime
      ? Math.floor((timestamp - startTime) / 1000)
      : 0;
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

  /**
   * [FLAG] Menggunakan MutationObserver untuk mendeteksi upaya terjemahan halaman oleh browser.
   */
  useEffect(() => {
    if (step !== "exam") return;

    const handleMutation = (mutationsList) => {
      for (const mutation of mutationsList) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          const htmlElement = document.documentElement;
          if (htmlElement.className.includes("translated")) {
            const isAlreadyFlagged = misuseEventsRef.current.some(
              (e) => e.type === "translation_attempt"
            );
            if (!isAlreadyFlagged) {
              // console.log("FLAG: User attempted to translate the page.");
              const timestamp = Date.now();
              const elapsedSec = startTime
                ? Math.floor((timestamp - startTime) / 1000)
                : 0;
              const relativeHMS = formatHMS(elapsedSec);
              misuseEventsRef.current.push({
                type: "translation_attempt",
                timestamp: timestamp,
                details: `[${relativeHMS}] 警告！ ページの翻訳が検出されました。 (Upaya penerjemahan halaman terdeteksi).`,
              });
            }
          }
        }
      }
    };

    const observer = new MutationObserver(handleMutation);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [step, startTime, formatHMS]);

  // ========================================================================
  // FUNGSI UTAMA APLIKASI
  // ========================================================================

  /**
   * Mengonversi detik menjadi format jam:menit:detik (HH:MM:SS).
   * @param {number} sec - Jumlah detik.
   * @returns {string} String waktu terformat.
   */
  function formatHMS(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  /**
   * [ENTRYPOINT] Fungsi yang dipanggil saat tombol "Mulai Ujian" diklik.
   * Melakukan pengecekan riwayat tes ke Kintone sebelum memulai.
   */
  const handleStartExam = async () => {
    // console.log("FUNCTION_CALL: handleStartExam");

    if (!params.email || !params.id) {
      setAuthError(
        "Anda tidak terautentifikasi. Harap pastikan Anda mengakses halaman ini dengan parameter email dan ID yang valid."
      );
      misuseEventsRef.current.push({
        type: "auth_error",
        timestamp: Date.now(),
        details: "Missing email or ID in URL parameters.",
      });
      return;
    }

    const loadingToast = toast.loading("Mengecek riwayat tes...");
    try {
      const res = await fetch("/api/check-test-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: params.email }),
      });
      const data = await res.json();
      // console.log("API_RESPONSE (check-test-history):", data);
      toast.dismiss(loadingToast);

      if (!res.ok) throw new Error(data.message || "Gagal menghubungi server.");

      if (data.hasTakenTest) {
        toast.error("Anda sudah pernah mengerjakan tes ini.");
        setIsLockModalOpen(true);
      } else {
        toast.success("Anda bisa memulai tes.");
        await beginExamFlow();
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.message || "Terjadi kesalahan saat pengecekan.");
      console.error("Check history error:", error);
    }
  };

  /**
   * [LOCK SYSTEM] Memverifikasi kode unik yang dimasukkan pengguna.
   * @param {Event} e - Event dari form submission.
   */
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    // console.log("FUNCTION_CALL: handleVerifyCode");
    setIsVerifying(true);
    const loadingToast = toast.loading("Memverifikasi kode...");
    try {
      const res = await fetch("/api/verify-unique-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uniqueCode: uniqueCodeInput }),
      });
      const data = await res.json();
      // console.log("API_RESPONSE (verify-unique-code):", data);

      if (!res.ok) {
        toast.dismiss(loadingToast);
        throw new Error(data.message || "Gagal menghubungi server verifikasi.");
      }

      if (data.isValid) {
        toast.dismiss(loadingToast);
        toast.success("Kode valid! Memulai tes...");
        setIsClosingLockModal(true);
        setTimeout(async () => {
          setIsLockModalOpen(false);
          setIsClosingLockModal(false);
          await beginExamFlow();
        }, 500);
      } else {
        toast.dismiss(loadingToast);
        toast.error(data.message || "Kode unik yang Anda masukkan salah.");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.message);
      console.error("Verify code error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * [CORE] Fungsi inti yang mempersiapkan dan memulai sesi ujian.
   * Termasuk meminta izin media, generate soal, dan memulai rekaman.
   */
  async function beginExamFlow() {
    // console.log("FUNCTION_CALL: beginExamFlow");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(s);
      const questions = generateQuestions();
      setQs(questions);
      setStep("exam"); // Pindah ke halaman ujian
      setStartTime(Date.now());
      scheduleRecordings(s);
    } catch (error) {
      console.error("Error getting media devices:", error);
      alert("Izin kamera & mikrofon diperlukan untuk mengikuti ujian ini.");
      misuseEventsRef.current.push({
        type: "media_permission_denied",
        timestamp: Date.now(),
        details: error.message,
      });
    }
  }

  /**
   * [HELPER] Meng-handle upload setiap segmen video ke server.
   * @param {Blob} blob - Data video dalam bentuk Blob.
   * @param {number} segmentIndex - Index dari segmen video.
   * @returns {Promise<string>} URL video yang sudah di-upload.
   */
  const uploadSegmentThroughProxy = useCallback(
    async (blob, segmentIndex) => {
      // console.log(`FUNCTION_CALL: uploadSegmentThroughProxy for segment ${segmentIndex}`);
      let id = params.id;
      if (!id) {
        const p = new URLSearchParams(window.location.search);
        id = p.get("id") || "";
      }
      if (!id) throw new Error("Missing user id");

      const filename = `segment_${segmentIndex + 1}_${Date.now()}.webm`;
      const form = new FormData();
      form.append("video", blob, filename);
      form.append("id", id);

      const res = await fetch("/api/upload-segment", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Upload failed: ${err}`);
      }
      const { videoUrl } = await res.json();
      const origin = window.location.origin;
      const fullUrl = `${origin}${videoUrl}`;
      // console.log(`DEBUG: Segment ${segmentIndex} uploaded to ${fullUrl}`);
      return fullUrl;
    },
    [params.id]
  );

  /**
   * [CORE] Menyiapkan dan mengacak soal ujian dari bank soal.
   * @returns {Array<object>} Array soal yang sudah siap ditampilkan.
   */
  function generateQuestions() {
    // console.log("FUNCTION_CALL: generateQuestions");
    let sel = [];
    for (const [grp, cnt] of Object.entries(CONFIG.groupCounts)) {
      const pool = QUESTION_GROUPS[grp] || [];
      const questionsToSelect = Math.min(cnt, pool.length);
      const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
      sel.push(...shuffledPool.slice(0, questionsToSelect));
    }
    const sh = sel.sort(() => 0.5 - Math.random());

    sh.forEach((q) => {
      if (
        q.options &&
        Array.isArray(q.options) &&
        q.answerIndex != null &&
        q.answerIndex >= 0 &&
        q.answerIndex < q.options.length
      ) {
        const correctOptionObject = q.options[q.answerIndex];
        const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());
        q.options = shuffledOptions;
        q.answerIndex = q.options.indexOf(correctOptionObject);
      } else {
        // console.warn(`WARN: Invalid question data found`, q);
      }
    });
    // console.log("DEBUG: Generated questions:", sh);
    return sh;
  }

  /**
   * [CORE] Menjadwalkan dan mengelola proses perekaman video per segmen.
   * @param {MediaStream} stream - Stream media dari getUserMedia.
   */
  const scheduleRecordings = useCallback(
    (stream) => {
      // console.log("FUNCTION_CALL: scheduleRecordings");
      recordingTimeoutsRef.current.forEach(clearTimeout);
      recordingTimeoutsRef.current = [];
      segmentsRef.current = [];
      recordingPromisesRef.current = [];
      chunksRef.current = {};

      const totalSegments = Math.ceil(
        CONFIG.examDuration / CONFIG.recordInterval
      );

      for (let i = 0; i < totalSegments; i++) {
        chunksRef.current[i] = [];
        const delayMs = i * CONFIG.recordInterval * 1000;
        const tid = setTimeout(() => {
          try {
            // console.log(`DEBUG: Starting recording for segment ${i+1}`);
            const rec = new MediaRecorder(stream, {
              mimeType: getOptimalMimeType(),
              videoBitsPerSecond: 170000,
            });
            const currentMimeType = rec.mimeType;

            rec.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) chunksRef.current[i].push(e.data);
            };
            recorderRef.current = rec;

            rec.onstop = async () => {
              // console.log(`DEBUG: Stopping recording for segment ${i+1}`);
              let uploadPromise;
              if (chunksRef.current[i] && chunksRef.current[i].length > 0) {
                const blob = new Blob(chunksRef.current[i], {
                  type: currentMimeType.split(";")[0],
                });
                uploadPromise = (async () => {
                  try {
                    const videoUrl = await uploadSegmentThroughProxy(
                      blob,
                      i,
                      currentMimeType.split(";")[0]
                    );
                    segmentsRef.current[i] = videoUrl;
                    return { status: "fulfilled", value: videoUrl, index: i };
                  } catch (error) {
                    segmentsRef.current[i] = {
                      status: "failed",
                      error: error.message,
                    };
                    return { status: "rejected", reason: error, index: i };
                  } finally {
                    delete chunksRef.current[i];
                  }
                })();
              } else {
                segmentsRef.current[i] = {
                  status: "empty",
                  type: currentMimeType.split(";")[0],
                };
                uploadPromise = Promise.resolve({
                  status: "fulfilled",
                  value: "EMPTY_SEGMENT",
                  index: i,
                });
              }
              recordingPromisesRef.current[i] = uploadPromise;
            };

            rec.onerror = (event) =>
              console.error(
                `MediaRecorder error on segment ${i + 1}:`,
                event.error
              );
            rec.start();

            setTimeout(() => {
              if (rec.state !== "inactive") rec.stop();
            }, CONFIG.recordDuration * 1000);
          } catch (error) {
            console.error(
              `FATAL Error during scheduled recording setup for segment ${
                i + 1
              }:`,
              error
            );
          }
        }, delayMs);
        recordingTimeoutsRef.current.push(tid);
      }
    },
    [uploadSegmentThroughProxy]
  );

  /**
   * [CORE] Mengumpulkan semua data, mengirimkannya ke server, dan mengakhiri ujian.
   */
  async function submitExam() {
    // console.log("FUNCTION_CALL: submitExam");
    clearInterval(countdownIntervalRef.current);
    recordingTimeoutsRef.current.forEach(clearTimeout);
    recordingTimeoutsRef.current = [];

    // Hentikan rekaman terakhir jika masih berjalan
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      await new Promise((resolve) => {
        recorderRef.current.onstop = resolve;
        recorderRef.current.stop();
      });
    }

    // Tunggu semua proses upload selesai
    await Promise.allSettled(recordingPromisesRef.current.filter(Boolean));
    // console.log("DEBUG: All video upload promises settled.");

    // Hentikan stream kamera
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    const end = Date.now();
    setElapsed(end - (startTime || end));

    // Format waktu submit
    const displayString = new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "short",
      timeStyle: "medium",
      hour12: false,
    }).format(end);
    setSubmitTimeDisplay(displayString);
    const webhookString = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Makassar",
      dateStyle: "short",
      timeStyle: "medium",
      hour12: false,
    }).format(end);
    setSubmitTimeForWebhook(webhookString);

    // Kumpulkan URL video yang berhasil di-upload
    const videoUrls = segmentsRef.current
      .map((item) => (typeof item === "string" ? item : null))
      .filter(Boolean);

    // Hitung skor
    const questionsCount = qs.length;
    const correctCount = qs.filter((q, i) => ans[i] === q.answerIndex).length;
    const computedScore =
      questionsCount > 0
        ? Math.round((correctCount / questionsCount) * 100)
        : 0;
    setScoreState(computedScore);

    setIsClosingSubmitting(false);
    setIsSubmitting(true);

    // Siapkan detail jawaban untuk dikirim
    const responses = qs.map((q, i) => {
      /* ... (Logic to map responses) ... */
    });

    // Siapkan payload akhir
    const finalPayload = {
      email: params.email,
      id: params.id,
      tag: params.tag,
      score: computedScore,
      submitTime: webhookString,
      elapsed: Math.floor((end - (startTime || end)) / 1000),
      responses,
      flags: misuseEventsRef.current,
      videoUrls,
    };
    // console.log("SUBMIT_PAYLOAD:", finalPayload);

    // Kirim data ke API
    try {
      const submitRes = await fetch("/api/submitExam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      if (!submitRes.ok) {
        const errorText = await submitRes.text();
        throw new Error(
          `Submit failed with status: ${submitRes.status}. Response: ${errorText}`
        );
      }
      // console.log("SUCCESS: Exam data submitted successfully.");
    } catch (error) {
      console.error("Error submitting exam data:", error);
      alert(
        "Gagal mengirim data ujian secara lengkap. Harap hubungi administrator"
      );
    } finally {
      setIsClosingSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setStep("result"); // Pindah ke halaman hasil
      }, 300);
    }
  }

  /**
   * Meng-handle alur untuk mulai submit, dari konfirmasi hingga proses.
   */
  function startSubmitFlow() {
    // console.log("FUNCTION_CALL: startSubmitFlow");
    setIsConfirmSubmitModalOpen(false);
    setIsClosingConfirm(false);
    setIsClosingSubmitting(false);
    setIsSubmitting(true);
    submitExamRef.current();
  }

  // --- HANDLER UNTUK MODAL & EVENT LAINNYA ---
  const handleInitiateSubmit = () => setIsConfirmSubmitModalOpen(true);
  const closeConfirmModal = () => {
    setIsClosingConfirm(true);
    setTimeout(() => {
      setIsConfirmSubmitModalOpen(false);
      setIsClosingConfirm(false);
    }, 300);
  };
  const handleConfirmSubmit = () => {
    setIsClosingConfirm(true);
    setTimeout(() => {
      setIsConfirmSubmitModalOpen(false);
      setIsClosingConfirm(false);
      startSubmitFlow();
    }, 300);
  };
  const agreeCheck = (event) => setIsAgreed(event.target.checked);
  const openQuestionMapModal = () => setIsQuestionMapModalOpen(true);
  const closeQuestionMapModal = () => {
    setIsClosingQuestionMap(true);
    setTimeout(() => {
      setIsQuestionMapModalOpen(false);
      setIsClosingQuestionMap(false);
    }, 300);
  };
  const closeAuthErrorModal = () => {
    setIsClosingAuthError(true);
    setTimeout(() => {
      setAuthError(null);
      setIsClosingAuthError(false);
    }, 300);
  };

  /**
   * Mengatur ulang semua state ke nilai awal untuk memulai ujian baru.
   */
  const handleRetryExam = () => {
    // console.log("FUNCTION_CALL: handleRetryExam - Resetting all states.");
    setStep("intro");
    setQs([]);
    setAns({});
    setCur(0);
    setTimeLeft(CONFIG.examDuration);
    setIsSubmitting(false);
    setStartTime(null);
    setElapsed(null);
    setIsAgreed(false);
    if (stream) stream.getTracks().forEach((track) => track.stop());
    setStream(null);
    clearInterval(countdownIntervalRef.current);
    recordingTimeoutsRef.current.forEach(clearTimeout);
    recordingTimeoutsRef.current = [];
    if (recorderRef.current && recorderRef.current.state !== "inactive")
      recorderRef.current.stop();
    segmentsRef.current = [];
    chunksRef.current = {};
    misuseEventsRef.current = [];
  };

  // ========================================================================
  // RENDER LOGIC (JSX)
  // ========================================================================
  // console.log(`DEBUG: Rendering component. Current step: ${step}`);
  return (
    <div className="w-full flex justify-center items-center min-h-screen bg-slate-200 select-none relative overflow-hidden overscroll-none">
      {/* Tampilkan layar 'Unsupported Browser' jika browser bukan Chrome */}
      {!isBrowserSupported ? (
        <UnsupportedBrowserScreen />
      ) : (
        /* Jika browser didukung, tampilkan aplikasi utama */
        <>
          {/* Komponen Toaster untuk menampilkan notifikasi di seluruh aplikasi */}
          <Toaster position="top-center" reverseOrder={false} />

          {/* Semua komponen modal yang bisa muncul di atas layar */}
          <SubmittingModal
            isOpen={isSubmitting}
            isClosing={isClosingSubmitting}
          />
          <AuthErrorModal
            isOpen={!!authError}
            errorMessage={authError}
            isClosing={isClosingAuthError}
            onClose={closeAuthErrorModal}
          />
          <QuestionMapModal
            isOpen={isQuestionMapModalOpen}
            isClosing={isClosingQuestionMap}
            onClose={closeQuestionMapModal}
            qs={qs}
            ans={ans}
            cur={cur}
            setCur={setCur}
          />
          <ConfirmSubmitModal
            isOpen={isConfirmSubmitModalOpen}
            isClosing={isClosingConfirm}
            onCancel={closeConfirmModal}
            onConfirm={handleConfirmSubmit}
          />
          <LockModal
            isOpen={isLockModalOpen}
            isClosing={isClosingLockModal}
            onSubmit={handleVerifyCode}
            uniqueCode={uniqueCodeInput}
            setUniqueCode={setUniqueCodeInput}
            isVerifying={isVerifying}
          />

          {/* Render kondisional berdasarkan state 'step' */}
          {step === "intro" && (
            <IntroScreen
              isAgreed={isAgreed}
              onAgreeChange={agreeCheck}
              onStartExam={handleStartExam}
              config={CONFIG}
            />
          )}
          {step === "exam" && (
            <ExamScreen
              qs={qs}
              ans={ans}
              setAns={setAns}
              cur={cur}
              setCur={setCur}
              timeLeft={timeLeft}
              progress={progress}
              videoRef={videoRef}
              recorderState={recorderRef.current?.state}
              renderRubySegment={renderRubySegment}
              openQuestionMapModal={openQuestionMapModal}
              onInitiateSubmit={handleInitiateSubmit}
              formatHMS={formatHMS}
              totalQuestions={qs.length}
            />
          )}
          {step === "result" && (
            <ResultScreen
              finalScore={scoreState}
              submitTimeString={submitTimeDisplay}
              elapsed={elapsed}
              formatHMS={formatHMS}
              onRetry={handleRetryExam}
            />
          )}
        </>
      )}
    </div>
  );
}
