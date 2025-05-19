// pages/index.js
import React, { useState, useEffect, useRef } from "react";
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
  const segmentsRef = useRef([]);
  const chunksRef = useRef({});
  const countdownIntervalRef = useRef(null);
  const recordingTimeoutsRef = useRef([]);
  const misuseEventsRef = useRef([]);
  const [stream, setStream] = useState(null);
  const [params, setParams] = useState({ email: "", id: "" });

  const totalTime = useRef(CONFIG.examDuration); // Simpan durasi total di ref
  const progress = (timeLeft / totalTime.current) * 100;

  const [authError, setAuthError] = useState(null); // State untuk pesan error autentikasi

  const [isConfirmSubmitModalOpen, setIsConfirmSubmitModalOpen] =
    useState(false);
  const [isQuestionMapModalOpen, setIsQuestionMapModalOpen] = useState(false);
  const [isClosingAuthError, setIsClosingAuthError] = useState(false);
  const [isClosingQuestionMap, setIsClosingQuestionMap] = useState(false);
  const [isClosingConfirm, setIsClosingConfirm] = useState(false); // State baru untuk animasi keluar konfirmasi
  const [isClosingSubmitting, setIsClosingSubmitting] = useState(false); // State baru untuk animasi keluar submitting

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
    if (!params.email || !params.id) {
      setAuthError(
        "Anda tidak terautentifikasi. Harap pastikan Anda mengakses halaman ini dengan parameter email dan ID yang valid."
      );
      return; // Mencegah ujian dimulai
    }

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

  // function generateQuestions() {
  //   let sel = [];
  //   for (const [grp, cnt] of Object.entries(CONFIG.groupCounts)) {
  //     const pool = QUESTION_GROUPS[grp] || [];
  //     sel.push(...pool.sort(() => 0.5 - Math.random()).slice(0, cnt));
  //   }
  //   const sh = sel.sort(() => 0.5 - Math.random());
  //   sh.forEach((q) => (q.options = q.options.sort(() => 0.5 - Math.random())));
  //   return sh;
  // }
  function generateQuestions() {
    let sel = [];
    for (const [grp, cnt] of Object.entries(CONFIG.groupCounts)) {
      const pool = QUESTION_GROUPS[grp] || []; // Ensure we don't try to slice more questions than available
      sel.push(
        ...pool
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(cnt, pool.length))
      );
    } // Acak urutan pertanyaan secara keseluruhan
    const sh = sel.sort(() => 0.5 - Math.random());

    sh.forEach((q) => {
      // Pastikan pertanyaan memiliki opsi dan answerIndex yang valid
      if (
        q.options &&
        Array.isArray(q.options) &&
        q.answerIndex != null &&
        q.answerIndex >= 0 &&
        q.answerIndex < q.options.length
      ) {
        // --- START: Perbaikan Logika Randomize Opsi ---
        // 1. Ambil referensi ke OBJEK array opsi yang benar SEBELUM diacak
        //    Ini penting karena opsi adalah array of objects [{ base: ..., ruby: ... }]
        const correctOptionObject = q.options[q.answerIndex]; // 2. Acak urutan array opsi (buat salinan agar data asli di QUESTION_GROUPS tidak berubah)

        const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());
        q.options = shuffledOptions; // Ganti array opsi lama dengan yang sudah diacak // 3. Cari INDEKS BARU dari objek opsi yang benar di dalam array yang sudah diacak

        const newAnswerIndex = q.options.indexOf(correctOptionObject); // 4. Perbarui answerIndex dengan indeks yang baru ditemukan

        if (newAnswerIndex !== -1) {
          q.answerIndex = newAnswerIndex;
        } else {
          // Kasus darurat: seharusnya tidak terjadi jika data awal valid
          console.error(
            "Error: Jawaban benar tidak ditemukan setelah pengacakan opsi!",
            q
          );
          q.answerIndex = -1; // Tandai sebagai tidak valid // Mungkin tambahkan log misuseEvent di sini jika ini dianggap indikasi data error
          misuseEventsRef.current.push({
            type: "generate_question_error",
            timestamp: Date.now(),
            details: `Failed to find correct option object after shuffle for question index ${sh.indexOf(
              q
            )}: ${
              q.q
                ? Array.isArray(q.q)
                  ? q.q.map((s) => s.base).join("")
                  : q.q
                : "N/A"
            }`,
          });
        } // --- END: Perbaikan Logika Randomize Opsi ---
      } else {
        // Tangani kasus pertanyaan tanpa opsi atau answerIndex tidak valid
        console.warn("Pertanyaan tanpa opsi atau answerIndex tidak valid:", q);
        q.options = []; // Pastikan opsinya kosong
        q.answerIndex = -1; // Tandai sebagai tidak ada jawaban benar
        misuseEventsRef.current.push({
          type: "generate_question_error",
          timestamp: Date.now(),
          details: `Question has no options or invalid structure: ${
            q.q
              ? Array.isArray(q.q)
                ? q.q.map((s) => s.base).join("")
                : q.q
              : "N/A"
          }`,
        });
      }
    });

    return sh; // Kembalikan array pertanyaan yang sudah diacak (termasuk opsi dan answerIndex yang sudah diperbarui)
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
    // console.log("Attempting to submit exam..."); // stop countdown & scheduled recordings

    clearInterval(countdownIntervalRef.current);
    recordingTimeoutsRef.current.forEach(clearTimeout);
    recordingTimeoutsRef.current = []; // Clear the array // stop active recorder if any

    if (recorderRef.current?.state !== "inactive") {
      try {
        recorderRef.current.stop();
        // console.log("Active recorder stopped.");
      } catch (error) {
        console.error("Error stopping active recorder:", error);
        misuseEventsRef.current.push({
          type: "stop_recorder_error",
          timestamp: Date.now(),
          details: error.message,
        });
      }
    } // stop camera preview stream as soon as submit begins

    if (stream) {
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
    } // isSubmitting is already true when this function is called from handleConfirmSubmit

    const end = Date.now();
    setSubmitTime(end);
    setElapsed(end - (startTime || end)); // Handle case where startTime might be null

    const videoUrls = [];
    // console.log("Processing video segments:", segmentsRef.current.length);

    // Use a loop with async/await to upload segments sequentially
    for (let i = 0; i < segmentsRef.current.length; i++) {
      const blob = segmentsRef.current[i];
      if (!blob || blob.size === 0) {
        console.warn(`Skipping empty or null blob for segment ${i}.`);
        videoUrls.push(`Segment_${i + 1}_Empty`); // Indicate missing segment
        continue;
      }
      const fname = `${params.email}_${params.id}_${
        new Date(end)
          .toLocaleString("sv-SE")
          .replace(/[\s:]/g, "_")
          .replace(/\//g, "-") // Format timestamp to be more filename-friendly
      }_take${i + 1}.webm`;
      const file = new File([blob], fname, { type: "video/webm" });
      const fd = new FormData();
      fd.append("file", file);

      // console.log(`Uploading segment ${i + 1} (${fname})...`);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(
            `Upload failed with status: ${res.status}. Response: ${errorText}`
          );
        }
        const json = await res.json();
        if (json.videoUrl) {
          videoUrls.push(json.videoUrl);
          // console.log(`Segment ${i + 1} uploaded: ${json.videoUrl}`);
        } else {
          throw new Error("Upload successful, but no videoUrl in response.");
        }
      } catch (error) {
        console.error(`Error uploading segment ${i + 1}:`, error);
        videoUrls.push(`Upload Failed: ${error.message}`); // Record failure
        misuseEventsRef.current.push({
          type: "upload_error",
          timestamp: Date.now(),
          details: `Segment ${i}: ${error.message}`,
        });
      }
    }
    // console.log("All segments processed. Video URLs:", videoUrls);

    // Ensure qs has been populated before calculating score
    // Fallback to expected total count if qs is empty for some reason
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

    // Prepare responses including question text, user answer text, and correct answer text
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
          : "Tidak dijawab"; // Handle unanswered

      const correctAnswerText =
        correctAnswerIndex != null && q.options?.[correctAnswerIndex] != null
          ? Array.isArray(q.options[correctAnswerIndex])
            ? q.options[correctAnswerIndex].map((s) => s.base).join("")
            : q.options[correctAnswerIndex]
          : "N/A"; // Should always have a correct answer if question is valid

      return {
        question: questionText,
        answerIndex: userAnswerIndex != null ? userAnswerIndex : null, // Store index too if needed
        answerText: userAnswerText,
        correctAnswerIndex:
          correctAnswerIndex != null ? correctAnswerIndex : null, // Store index too
        correctAnswerText: correctAnswerText,
        isCorrect: userAnswerIndex === correctAnswerIndex,
      };
    });

    // console.log("Submitting final data to /api/submitExam..."); // Send final data to server endpoint
    try {
      const submitRes = await fetch("/api/submitExam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: params.email,
          id: params.id,
          score,
          submitTime: new Date(end).toLocaleString(),
          elapsed: Math.floor((end - (startTime || end)) / 1000), // Handle potential null startTime
          responses, // Use detailed responses
          flags: misuseEventsRef.current, // Send collected misuse flags
          videoUrls,
        }),
      });

      if (!submitRes.ok) {
        const errorText = await submitRes.text();
        throw new Error(
          `Submit failed with status: ${submitRes.status}. Response: ${errorText}`
        );
      }
      // console.log("Exam data submitted successfully.");
    } catch (error) {
      console.error("Error submitting exam data:", error);
      // Potentially show an error message to the user, but proceed to result step
      alert(
        "Failed to submit exam results completely. Please contact support."
      );
      misuseEventsRef.current.push({
        type: "submit_error",
        timestamp: Date.now(),
        details: `Final submit failed: ${error.message}`,
      });
    } finally {
      // Always transition out of submitting and show result, even if final submit failed
      // console.log("Submit process finished. Triggering submit modal close and result step.");
      // Trigger closing animation for submitting modal
      setIsClosingSubmitting(true);
      // Wait for animation duration before changing step and hiding modal
      setTimeout(() => {
        setIsSubmitting(false); // Hide submitting modal
        setStep("result"); // Transition to result step
      }, 300); // Match animation duration (e.g., 300ms)
    }
  } // Handler untuk memunculkan modal konfirmasi submit

  const handleInitiateSubmit = () => {
    setIsConfirmSubmitModalOpen(true);
  }; // Handler untuk tombol 'Tidak' di modal konfirmasi

  const closeConfirmModal = () => {
    setIsClosingConfirm(true);
    setTimeout(() => {
      setIsConfirmSubmitModalOpen(false);
      setIsClosingConfirm(false); // Reset state closing
    }, 300); // Durasi animasi
  }; // Handler untuk tombol 'Ya' di modal konfirmasi

  const handleConfirmSubmit = () => {
    // Start closing animation for confirm modal
    setIsClosingConfirm(true);
    // Immediately show the submitting modal (it will animate in)
    setIsSubmitting(true);

    // Wait for confirm modal animation to finish before proceeding to submitExam
    setTimeout(() => {
      setIsConfirmSubmitModalOpen(false); // Hide confirm modal
      setIsClosingConfirm(false); // Reset state closing
      submitExam(); // Call the main submit logic
    }, 300); // Match animation duration
  };

  const finalScore = Math.round(
    (qs.filter((q, i) => ans[i] === q.answerIndex).length / (qs.length || 1)) *
      100
  );

  const agreeCheck = (event) => {
    setIsAgreed(event.target.checked);
  };

  const openQuestionMapModal = () => {
    setIsQuestionMapModalOpen(true);
  };

  const closeQuestionMapModal = () => {
    setIsClosingQuestionMap(true);
    setTimeout(() => {
      setIsQuestionMapModalOpen(false);
      setIsClosingQuestionMap(false); // Reset state closing
    }, 300); // Durasi animasi
  };

  const closeAuthErrorModal = () => {
    setIsClosingAuthError(true);
    setTimeout(() => {
      setAuthError(null);
      setIsClosingAuthError(false); // Reset state closing
    }, 300); // Durasi animasi (sesuaikan dengan durasi di CSS)
  };

  const handleRetryExam = () => {
    // Implementasikan SEMUA LOGIKA RESET STATE di sini
    // console.log("Mereset ujian...");
    setStep("intro");
    setQs([]);
    setAns({});
    setCur(0);
    setTimeLeft(CONFIG.examDuration);
    setIsSubmitting(false);
    setStartTime(null);
    setSubmitTime(null);
    setElapsed(null);
    setIsAgreed(false);
    // Reset refs dan hentikan stream/recorder jika aktif
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    recordingTimeoutsRef.current.forEach(clearTimeout);
    if (recorderRef.current?.state !== "inactive") recorderRef.current.stop();
    segmentsRef.current = [];
    chunksRef.current = {};
    misuseEventsRef.current = [];
    // Reset state penutup modal jika diperlukan
    setIsClosingAuthError(false);
    setIsClosingQuestionMap(false);
    setIsConfirmSubmitModalOpen(false);
    setIsClosingConfirm(false);
    setIsClosingSubmitting(false);
    // Mungkin perlu generate pertanyaan baru juga di sini atau di begin()
    // generateQuestions(); // Jika generateQuestions() dipanggil saat begin()
  };

  return (
    <div className="flex justify-center items-center min-h-screen py-12 bg-slate-200 select-none relative overflow-hidden">
      <SubmittingModal isOpen={isSubmitting} isClosing={isClosingSubmitting} />
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
      {step === "intro" && (
        <IntroScreen
          isAgreed={isAgreed}
          onAgreeChange={agreeCheck}
          onStartExam={begin}
          config={CONFIG}
          // Maybe pass authError state/handler if IntroScreen itself needs to react to it
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
          stream={stream} // Pass stream if video component needs it
          renderRubySegment={renderRubySegment} // Pass helper function
          openQuestionMapModal={openQuestionMapModal} // Pass handler for map button
          onInitiateSubmit={handleInitiateSubmit} // Pass handler for submit button
          formatHMS={formatHMS} // Pass helper function
          totalQuestions={qs.length} // Pass total questions
        />
      )}
      {step === "result" && (
        <ResultScreen
          finalScore={finalScore} // Melewatkan state finalScore
          submitTime={submitTime} // Melewatkan state submitTime
          elapsed={elapsed} // Melewatkan state elapsed
          formatHMS={formatHMS} // Melewatkan fungsi helper
          onRetry={handleRetryExam} // Melewatkan fungsi handler reset
        />
      )}
    </div>
  );
}
