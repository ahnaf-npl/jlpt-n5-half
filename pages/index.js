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

  // Fungsi untuk menjadwalkan perekaman video secara berkala
  // function scheduleRecordings(stream) {
  //   // console.log("Scheduling recordings..."); // Log awal penjadwalan
  //   // Bersihkan timeout penjadwalan sebelumnya
  //   recordingTimeoutsRef.current.forEach(clearTimeout);
  //   recordingTimeoutsRef.current = []; // Reset array
  //   segmentsRef.current = []; // Reset array segmen yang sudah jadi Blob
  //   chunksRef.current = {}; // Reset object chunks sementara

  //   const totalSegments = Math.ceil(
  //     CONFIG.examDuration / CONFIG.recordInterval
  //   ); // console.log(`Total segments to schedule: ${totalSegments}`); // Log jumlah segmen
  //   for (let i = 0; i < totalSegments; i++) {
  //     // Inisialisasi array chunk untuk segmen ini di chunksRef
  //     chunksRef.current[i] = []; // console.log(`Initialized chunksRef.current[${i}] = []`); // Log inisialisasi chunk // Jadwalkan timeout untuk memulai perekaman segmen ke-i
  //     const delayMs = i * CONFIG.recordInterval * 1000; // console.log(`Scheduling start for segment ${i + 1} in ${delayMs / 1000} seconds`); // Log penjadwalan start
  //     const tid = setTimeout(() => {
  //       // console.log(`--- Starting process for segment ${i + 1} (scheduled) ---`); // Log saat timeout terpicu untuk start

  //       try {
  //         // Buat instance MediaRecorder baru
  //         const rec = new MediaRecorder(stream, {
  //           mimeType: "video/mp4", // Format video
  //           videoBitsPerSecond: 100000, // Kualitas video (sesuaikan jika perlu)
  //         }); // console.log(`MediaRecorder created for segment ${i + 1}. Initial state: ${rec.state}`); // Log recorder created // Simpan instance recorder terakhir di ref (berguna jika submit dini)
  //         recorderRef.current = rec; // console.log(`recorderRef.current updated for segment ${i+1}`); // Log update ref // Listener saat data rekaman tersedia
  //         rec.ondataavailable = (e) => {
  //           // console.log(`Event ondataavailable fired for segment ${i + 1}. Data size: ${e.data ? e.data.size : 'null/undefined'}`); // Log data size
  //           if (e.data && e.data.size > 0) {
  //             // Periksa kembali apakah chunksRef.current[i] masih valid
  //             if (!chunksRef.current[i]) {
  //               // console.error(`chunksRef.current[${i}] is null/undefined in ondataavailable for segment ${i+1}! Attempting re-initialization.`); // Critical error check
  //               chunksRef.current[i] = []; // Coba re-inisialisasi jika null
  //             }
  //             chunksRef.current[i].push(e.data); // Tambahkan chunk data ke segmen yang sesuai // console.log(`Pushed chunk to segment ${i+1}. Total chunks: ${chunksRef.current[i].length}`); // Log jumlah chunk
  //           } else {
  //             // console.warn(`ondataavailable fired for segment ${i+1} with empty data.`); // Log warning data kosong
  //           }
  //         }; // Listener saat perekaman berhenti

  //         rec.onstop = () => {
  //           // console.log(`Event onstop fired for segment ${i + 1}. State was: ${rec.state}`); // Log stop event dan state terakhir
  //           // console.log(`State of chunksRef.current[${i}] in onstop for segment ${i+1}:`, chunksRef.current[i]); // Log isi chunks saat onstop
  //           // Gabungkan chunks menjadi satu Blob
  //           if (chunksRef.current[i] && chunksRef.current[i].length > 0) {
  //             // console.log(`Chunks found for segment ${i+1}. Creating blob...`); // Log blob creation
  //             const blob = new Blob(chunksRef.current[i], {
  //               type: "video/webm",
  //             });
  //             segmentsRef.current[i] = blob; // Simpan Blob di array segmen utama // console.log(`Blob created for segment ${i+1}: ${blob.size} bytes. Stored at segmentsRef.current[${i}]`); // Log blob created & stored // Bersihkan chunks sementara untuk segmen ini
  //             delete chunksRef.current[i]; // console.log(`Cleaned up chunksRef.current[${i}]`); // Log cleanup
  //           } else {
  //             // console.warn(`Warning: No chunks recorded for segment ${i + 1}. Blob not created.`); // Log warning asli
  //             segmentsRef.current[i] = new Blob([], { type: "video/webm" }); // Simpan blob kosong
  //             misuseEventsRef.current.push({
  //               // Log empty segment issue
  //               type: "empty_video_segment_scheduled",
  //               timestamp: Date.now(),
  //               details: `Scheduled segment ${i} resulted in no chunks.`,
  //             }); // console.log(`Stored empty blob for segment ${i+1} due to FATAL error at segmentsRef.current[${i}]`); // console.log(`--- Finished process for segment ${i + 1} (FATAL error) ---`);
  //           }
  //         };

  //         rec.onerror = (event) => {
  //           // console.error(`Recorder error on segment ${i + 1}:`, event.error); // Log error recorder
  //           misuseEventsRef.current.push({
  //             // Log recorder error
  //             type: "recorder_error",
  //             timestamp: Date.now(),
  //             details: `Segment ${i}: ${event.error.message}`,
  //           }); // Lanjutkan meskipun ada error pada segmen ini // onstop biasanya tetap terpicu setelah onerror
  //         }; // console.log(`Calling start() for segment ${i+1}. Current state: ${rec.state}`); // Log state sebelum start

  //         rec.start(); // Mulai perekaman // console.log(`Recorder state after start for segment ${i+1}: ${rec.state}`); // Log state setelah start // Jadwalkan timeout untuk menghentikan perekaman setelah recordDuration
  //         const stopDelayMs = CONFIG.recordDuration * 1000; // console.log(`Scheduling stop for segment ${i+1} in ${stopDelayMs / 1000} seconds. Target time: ${new Date(Date.now() + stopDelayMs).toISOString()}`); // Log penjadwalan stop
  //         setTimeout(() => {
  //           // console.log(`--- Starting process for segment ${i + 1} (scheduled stop) ---`); // Log saat timeout terpicu untuk stop
  //           if (rec.state !== "inactive") {
  //             // Cek apakah recorder masih aktif sebelum stop
  //             // console.log(`Attempting scheduled stop for segment ${i + 1} with state: ${rec.state}...`);
  //             rec.stop();
  //           } else {
  //             // console.log(`Scheduled stop called for segment ${i + 1}, recorder was already inactive.`);
  //             // console.log(`--- Finished process for segment ${i + 1} (scheduled stop - already inactive) ---`);
  //           }
  //         }, stopDelayMs); // Hentikan setelah durasi rekaman
  //       } catch (error) {
  //         // console.error(`FATAL Error in scheduled recording timeout for segment ${i + 1}:`, error); // Log error fatal di timeout
  //         misuseEventsRef.current.push({
  //           type: "recorder_scheduled_init_error",
  //           timestamp: Date.now(),
  //           details: `Segment ${i} scheduling/init failed: ${error.message}`,
  //         });
  //         segmentsRef.current[i] = new Blob([], { type: "video/webm" }); // Masukkan blob kosong // console.log(`Stored empty blob for segment ${i+1} due to FATAL error at segmentsRef.current[${i}]`); // console.log(`--- Finished process for segment ${i + 1} (FATAL error) ---`);
  //       }
  //     }, delayMs); // Mulai setiap interval // Simpan ID timeout agar bisa dibersihkan nanti oleh submitExam

  //     recordingTimeoutsRef.current.push(tid);
  //   } // console.log(`Finished scheduling all ${totalSegments} recording segments.`); // Log akhir penjadwalan
  // }

  // Helper function untuk menentukan mimeType yang optimal
  // Tempatkan fungsi ini DI LUAR fungsi React Component Anda (misalnya di atas atau di bawahnya, atau di file helper terpisah)
  function getOptimalMimeType() {
    // Deteksi jika perangkat adalah iOS (iPad, iPhone, iPod)
    // Perlu diingat bahwa Chrome di iOS menggunakan user agent yang mirip Safari
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // Prioritaskan MP4 untuk iOS karena kompatibilitas bagus dengan Google Drive
    if (isIOS && MediaRecorder.isTypeSupported("video/mp4")) {
      console.log("Using video/mp4 for iOS device.");
      return "video/mp4";
    }
    // Fallback ke WebM dengan codec VP8, yang umumnya didukung luas di non-iOS
    else if (MediaRecorder.isTypeSupported("video/webm; codecs=vp8")) {
      console.log("Using video/webm; codecs=vp8.");
      return "video/webm; codecs=vp8";
    }
    // Fallback ke WebM generik jika codec spesifik tidak didukung
    else if (MediaRecorder.isTypeSupported("video/webm")) {
      console.log("Using video/webm (generic).");
      return "video/webm";
    }
    // Sebagai pilihan terakhir, default ke WebM (meskipun ini seharusnya tidak terjadi jika MediaRecorder tersedia)
    console.warn(
      "No specific MediaRecorder mimeType supported. Defaulting to video/webm."
    );
    return "video/webm";
  }

  // Fungsi untuk menjadwalkan perekaman video secara berkala
  function scheduleRecordings(stream) {
    // console.log("Scheduling recordings..."); // Log awal penjadwalan
    // Bersihkan timeout penjadwalan sebelumnya
    recordingTimeoutsRef.current.forEach(clearTimeout);
    recordingTimeoutsRef.current = []; // Reset array
    segmentsRef.current = []; // Reset array segmen yang sudah jadi Blob
    chunksRef.current = {}; // Reset object chunks sementara

    const totalSegments = Math.ceil(
      CONFIG.examDuration / CONFIG.recordInterval
    ); // console.log(`Total segments to schedule: ${totalSegments}`); // Log jumlah segmen
    for (let i = 0; i < totalSegments; i++) {
      // Inisialisasi array chunk untuk segmen ini di chunksRef
      chunksRef.current[i] = []; // console.log(`Initialized chunksRef.current[${i}] = []`); // Log inisialisasi chunk // Jadwalkan timeout untuk memulai perekaman segmen ke-i
      const delayMs = i * CONFIG.recordInterval * 1000; // console.log(`Scheduling start for segment ${i + 1} in ${delayMs / 1000} seconds`); // Log penjadwalan start
      const tid = setTimeout(() => {
        // console.log(`--- Starting process for segment ${i + 1} (scheduled) ---`); // Log saat timeout terpicu untuk start

        try {
          // Buat instance MediaRecorder baru
          const rec = new MediaRecorder(stream, {
            mimeType: getOptimalMimeType(), // <--- INI PERUBAHAN UTAMA
            videoBitsPerSecond: 100000, // Kualitas video (sesuaikan jika perlu)
          }); // console.log(`MediaRecorder created for segment ${i + 1}. Initial state: ${rec.state}`); // Log recorder created // Simpan instance recorder terakhir di ref (berguna jika submit dini)
          recorderRef.current = rec; // console.log(`recorderRef.current updated for segment ${i+1}`); // Log update ref // Listener saat data rekaman tersedia
          rec.ondataavailable = (e) => {
            // console.log(`Event ondataavailable fired for segment ${i + 1}. Data size: ${e.data ? e.data.size : 'null/undefined'}`); // Log data size
            if (e.data && e.data.size > 0) {
              // Periksa kembali apakah chunksRef.current[i] masih valid
              if (!chunksRef.current[i]) {
                // console.error(`chunksRef.current[${i}] is null/undefined in ondataavailable for segment ${i+1}! Attempting re-initialization.`); // Critical error check
                chunksRef.current[i] = []; // Coba re-inisialisasi jika null
              }
              chunksRef.current[i].push(e.data); // Tambahkan chunk data ke segmen yang sesuai // console.log(`Pushed chunk to segment ${i+1}. Total chunks: ${chunksRef.current[i].length}`); // Log jumlah chunk
            } else {
              // console.warn(`ondataavailable fired for segment ${i+1} with empty data.`); // Log warning data kosong
            }
          }; // Listener saat perekaman berhenti

          rec.onstop = () => {
            // console.log(`Event onstop fired for segment ${i + 1}. State was: ${rec.state}`); // Log stop event dan state terakhir
            // console.log(`State of chunksRef.current[${i}] in onstop for segment ${i+1}:`, chunksRef.current[i]); // Log isi chunks saat onstop
            // Gabungkan chunks menjadi satu Blob
            if (chunksRef.current[i] && chunksRef.current[i].length > 0) {
              // console.log(`Chunks found for segment ${i+1}. Creating blob...`); // Log blob creation
              const blob = new Blob(chunksRef.current[i], {
                type: getOptimalMimeType().split(";")[0], // <--- SESUAIKAN TYPE BLOB DI SINI
              });
              segmentsRef.current[i] = blob; // Simpan Blob di array segmen utama // console.log(`Blob created for segment ${i+1}: ${blob.size} bytes. Stored at segmentsRef.current[${i}]`); // Log blob created & stored // Bersihkan chunks sementara untuk segmen ini
              delete chunksRef.current[i]; // console.log(`Cleaned up chunksRef.current[${i}]`); // Log cleanup
            } else {
              // console.warn(`Warning: No chunks recorded for segment ${i + 1}. Blob not created.`); // Log warning asli
              segmentsRef.current[i] = new Blob([], {
                type: getOptimalMimeType().split(";")[0],
              }); // Simpan blob kosong
              misuseEventsRef.current.push({
                // Log empty segment issue
                type: "empty_video_segment_scheduled",
                timestamp: Date.now(),
                details: `Scheduled segment ${i} resulted in no chunks.`,
              }); // console.log(`Stored empty blob for segment ${i+1} due to FATAL error at segmentsRef.current[${i}]`); // console.log(`--- Finished process for segment ${i + 1} (FATAL error) ---`);
            }
          };

          rec.onerror = (event) => {
            // console.error(`Recorder error on segment ${i + 1}:`, event.error); // Log error recorder
            misuseEventsRef.current.push({
              // Log recorder error
              type: "recorder_error",
              timestamp: Date.now(),
              details: `Segment ${i}: ${event.error.message}`,
            }); // Lanjutkan meskipun ada error pada segmen ini // onstop biasanya tetap terpicu setelah onerror
          }; // console.log(`Calling start() for segment ${i+1}. Current state: ${rec.state}`); // Log state sebelum start

          rec.start(); // Mulai perekaman // console.log(`Recorder state after start for segment ${i+1}: ${rec.state}`); // Log state setelah start // Jadwalkan timeout untuk menghentikan perekaman setelah recordDuration
          const stopDelayMs = CONFIG.recordDuration * 1000; // console.log(`Scheduling stop for segment ${i+1} in ${stopDelayMs / 1000} seconds. Target time: ${new Date(Date.now() + stopDelayMs).toISOString()}`); // Log penjadwalan stop
          setTimeout(() => {
            // console.log(`--- Starting process for segment ${i + 1} (scheduled stop) ---`); // Log saat timeout terpicu untuk stop
            if (rec.state !== "inactive") {
              // Cek apakah recorder masih aktif sebelum stop
              // console.log(`Attempting scheduled stop for segment ${i + 1} with state: ${rec.state}...`);
              rec.stop();
            } else {
              // console.log(`Scheduled stop called for segment ${i + 1}, recorder was already inactive.`);
              // console.log(`--- Finished process for segment ${i + 1} (scheduled stop - already inactive) ---`);
            }
          }, stopDelayMs); // Hentikan setelah durasi rekaman
        } catch (error) {
          // console.error(`FATAL Error in scheduled recording timeout for segment ${i + 1}:`, error); // Log error fatal di timeout
          misuseEventsRef.current.push({
            type: "recorder_scheduled_init_error",
            timestamp: Date.now(),
            details: `Segment ${i} scheduling/init failed: ${error.message}`,
          });
          segmentsRef.current[i] = new Blob([], {
            type: getOptimalMimeType().split(";")[0],
          }); // Masukkan blob kosong // console.log(`Stored empty blob for segment ${i+1} due to FATAL error at segmentsRef.current[${i}]`); // console.log(`--- Finished process for segment ${i + 1} (FATAL error) ---`);
        }
      }, delayMs); // Mulai setiap interval // Simpan ID timeout agar bisa dibersihkan nanti oleh submitExam

      recordingTimeoutsRef.current.push(tid);
    } // console.log(`Finished scheduling all ${totalSegments} recording segments.`); // Log akhir penjadwalan
  }

  // Fungsi utama untuk submit ujian
  async function submitExam() {
    // console.log("Attempting to submit exam..."); // Log awal submit // stop countdown & scheduled recordings

    clearInterval(countdownIntervalRef.current);
    recordingTimeoutsRef.current.forEach(clearTimeout);
    recordingTimeoutsRef.current = []; // Clear the array // --- START: Modifikasi untuk Menunggu Recorder Stop --- // Hentikan recorder yang sedang aktif (jika ada) dan tunggu event 'stop'

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      // console.log("Active recorder found. Stopping and waiting for onstop...");
      try {
        // Buat Promise yang akan resolve ketika event 'stop' pada recorder terpicu
        await new Promise((resolve, reject) => {
          const currentRecorder = recorderRef.current;
          if (!currentRecorder) {
            console.warn("Recorder ref is null during stop attempt promise.");
            return resolve(); // Resolve segera jika ref somehow null
          }

          const onStopHandler = () => {
            // console.log("Active recorder onstop fired. Resolving promise."); // Bersihkan event listener setelah terpicu
            currentRecorder.removeEventListener("stop", onStopHandler);
            currentRecorder.removeEventListener("error", onErrorHandler); // Bersihkan error listener juga
            resolve(); // Resolve Promise
          };

          const onErrorHandler = (event) => {
            console.error("Recorder error during stop:", event);
            currentRecorder.removeEventListener("stop", onStopHandler);
            currentRecorder.removeEventListener("error", onErrorHandler); // Bersihkan error listener juga
            reject(
              new Error(
                `Recorder error during stop: ${
                  event.error ? event.error.name : "Unknown"
                }`
              )
            ); // Reject Promise // Log kesalahan recorder saat stop
            misuseEventsRef.current.push({
              type: "recorder_stop_error_event",
              timestamp: Date.now(),
              details: `Recorder error event during stop: ${
                event.error ? event.error.message : "Unknown Error"
              }`,
            });
          }; // Daftarkan event listeners

          currentRecorder.addEventListener("stop", onStopHandler);
          currentRecorder.addEventListener("error", onErrorHandler); // Tambahkan error listener

          currentRecorder.stop(); // Picu proses stop
          // console.log("recorder.stop() called.");
        }); // await akan menunggu promise ini selesai
        // console.log("Promise resolved: Finished waiting for recorder stop.");
      } catch (error) {
        console.error("Error during recorder stop process promise:", error); // Log kesalahan dari Promise reject
        misuseEventsRef.current.push({
          type: "recorder_stop_promise_rejected",
          timestamp: Date.now(),
          details: `Error awaiting recorder stop: ${error.message}`,
        }); // Lanjutkan proses submit meskipun ada error stop recorder, // mungkin segmen lain berhasil terekam.
      }
    } else {
      // console.log("No active recorder to stop. Proceeding directly.");
    } // --- END: Modifikasi untuk Menunggu Recorder Stop --- // stop camera preview stream as soon as submit begins
    if (stream) {
      // console.log("Stopping stream tracks...");
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
          // console.log("Media stream track stopped.");
        } catch (error) {
          console.error("Error stopping stream track:", error);
          misuseEventsRef.current.push({
            type: "stop_stream_error",
            timestamp: Date.now(),
            details: error.message,
          });
        }
      });
      setStream(null); // Clear the stream state
    } // isSubmitting is already true ketika fungsi ini dipanggil dari handleConfirmSubmit

    const end = Date.now(); // Catat waktu selesai
    setSubmitTime(end); // Simpan waktu submit
    setElapsed(end - (startTime || end)); // Hitung durasi (tangani jika startTime null)

    const videoUrls = [];
    // console.log(
    //   "Processing video segments for upload:",
    //   segmentsRef.current.length
    // ); // Log jumlah segmen // Gunakan loop dengan async/await untuk mengunggah segmen secara berurutan

    for (let i = 0; i < segmentsRef.current.length; i++) {
      const blob = segmentsRef.current[i];
      if (!blob || blob.size === 0) {
        console.warn(`Skipping empty or null blob for segment ${i}.`); // Log warning
        videoUrls.push(`Segment_${i + 1}_Empty`); // Indikasi segmen kosong
        misuseEventsRef.current.push({
          // Log empty segment as a potential issue
          type: "empty_video_segment",
          timestamp: Date.now(),
          details: `Segment ${i} was empty or null.`,
        });
        continue; // Lanjutkan ke segmen berikutnya
      } // Buat nama file yang unik
      const fname = `${params.email}_${params.id}_${
        new Date(end)
          .toLocaleString("sv-SE") // Format timestamp YYYY-MM-DD HH:MM:SS
          .replace(/[\s:]/g, "_") // Ganti spasi dan : dengan _
          .replace(/\//g, "-") // Ganti / dengan -
      }_take${i + 1}.webm`;
      const file = new File([blob], fname, { type: "video/webm" }); // Buat objek File
      const fd = new FormData(); // Buat FormData untuk upload
      fd.append("file", file); // Tambahkan file ke FormData

      // console.log(
      //   `Uploading segment ${i + 1} (${fname}, ${blob.size} bytes)...`
      // ); // Log proses upload
      try {
        // Kirim permintaan upload ke API endpoint
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const errorText = await res.text(); // Baca respons error
          throw new Error( // Lempar error jika respons tidak OK
            `Upload failed with status: ${res.status}. Response: ${errorText}`
          );
        }
        const json = await res.json(); // Parse respons JSON
        if (json.videoUrl) {
          videoUrls.push(json.videoUrl); // Simpan URL video yang berhasil diupload
          // console.log(`Segment ${i + 1} uploaded: ${json.videoUrl}`); // Log berhasil upload
        } else {
          throw new Error("Upload successful, but no videoUrl in response."); // Error jika URL tidak ada di respons
        }
      } catch (error) {
        console.error(`Error uploading segment ${i + 1}:`, error); // Log error upload
        videoUrls.push(`Upload Failed: ${error.message}`); // Catat kegagalan upload dengan pesan error
        misuseEventsRef.current.push({
          // Log error upload
          type: "upload_error",
          timestamp: Date.now(),
          details: `Segment ${i}: ${error.message}`,
        });
      }
    }
    // console.log("All segments processed. Video URLs:", videoUrls); // Log semua URL (atau indikasi kegagalan) // Hitung skor // Pastikan qs sudah terisi, gunakan hitungan dari CONFIG jika qs kosong

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
        : 0; // Skor 0 jika tidak ada pertanyaan // Siapkan data respons detail per soal

    const responses = qs.map((q, i) => {
      const userAnswerIndex = ans[i];
      const correctAnswerIndex = q.answerIndex;
      const questionText = Array.isArray(q.q)
        ? q.q.map((s) => s.base).join("") // Gabungkan base text jika array
        : q.q; // Gunakan langsung jika string
      const userAnswerText =
        userAnswerIndex != null && q.options?.[userAnswerIndex] != null // Cek jika user jawab dan opsi ada
          ? Array.isArray(q.options[userAnswerIndex])
            ? q.options[userAnswerIndex].map((s) => s.base).join("") // Gabungkan base text jika array
            : q.options[userAnswerIndex] // Gunakan langsung jika string
          : "Tidak dijawab"; // Handle tidak dijawab

      const correctAnswerText =
        correctAnswerIndex != null && q.options?.[correctAnswerIndex] != null // Cek jika answerIndex valid dan opsi ada
          ? Array.isArray(q.options[correctAnswerIndex])
            ? q.options[correctAnswerIndex].map((s) => s.base).join("") // Gabungkan base text jika array
            : q.options[correctAnswerIndex] // Gunakan langsung jika string
          : "N/A"; // Handle jika answerIndex tidak valid

      return {
        question: questionText,
        answerIndex: userAnswerIndex != null ? userAnswerIndex : null, // Store index jawaban user
        answerText: userAnswerText, // Store teks jawaban user
        correctAnswerIndex:
          correctAnswerIndex != null ? correctAnswerIndex : null, // Store index jawaban benar
        correctAnswerText: correctAnswerText, // Store teks jawaban benar
        isCorrect: userAnswerIndex === correctAnswerIndex, // Store status benar/salah
      };
    });

    // console.log("Submitting final data to /api/submitExam..."); // Log proses submit ke API
    try {
      // Kirim data lengkap ke server endpoint /api/submitExam
      const submitRes = await fetch("/api/submitExam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: params.email,
          id: params.id,
          score, // Skor total
          submitTime: new Date(end).toLocaleString(), // Waktu submit
          elapsed: Math.floor((end - (startTime || end)) / 1000), // Durasi
          responses, // Detail jawaban per soal
          flags: misuseEventsRef.current, // Flags misuse/error yang terkumpul
          videoUrls, // List URL video yang berhasil diupload (termasuk indikasi kegagalan)
        }),
      });

      if (!submitRes.ok) {
        const errorText = await submitRes.text(); // Baca respons error dari server
        throw new Error( // Lempar error jika respons tidak OK
          `Submit failed with status: ${submitRes.status}. Response: ${errorText}`
        );
      }
      // console.log("Exam data submitted successfully."); // Log berhasil submit
    } catch (error) {
      console.error("Error submitting exam data:", error); // Log error saat submit // Berikan pesan error ke user (meskipun akan tetap pindah ke step result)
      alert(
        "Gagal mengirim data ujian secara lengkap. Harap hubungi administrator jika masalah berlanjut."
      );
      misuseEventsRef.current.push({
        // Log error submit akhir
        type: "submit_error",
        timestamp: Date.now(),
        details: `Final submit failed: ${error.message}`,
      });
    } finally {
      // Bagian ini akan selalu dijalankan terlepas dari berhasil/gagal submit final
      // console.log(
      //   "Submit process finished. Triggering submit modal close and result step."
      // ); // Log selesai proses submit // Picu animasi keluar untuk modal submitting
      setIsClosingSubmitting(true); // Tunggu durasi animasi sebelum mengubah step dan menyembunyikan modal
      setTimeout(() => {
        setIsSubmitting(false); // Sembunyikan modal submitting (state isOpen)
        setStep("result"); // Pindah ke step result
      }, 300); // Sesuaikan durasi timeout dengan durasi animasi CSS
    }
  } // Handler untuk memunculkan modal konfirmasi submit (dipanggil dari ExamScreen)

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
