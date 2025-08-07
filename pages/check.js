// pages/check.js

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { UAParser } from "ua-parser-js";

// --- Komponen Ikon SVG ---
const IconCheck = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-green-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const IconX = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-red-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const IconSpinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

// --- Objek untuk hasil pengecekan ---
const initialResultsState = {
  media: null,
  browser: null,
  network: null,
  submission: null,
};

export default function CompatibilityCheckPage() {
  const [email, setEmail] = useState("");
  const [results, setResults] = useState(initialResultsState);
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (router.isReady) {
      const emailFromQuery = router.query.email;
      if (emailFromQuery && typeof emailFromQuery === "string") {
        setEmail(emailFromQuery);
      }
    }
  }, [router.isReady, router.query.email]);

  const runRemainingChecksAndSubmit = async () => {
    const uaResult = new UAParser().getResult();
    const tempResults = {};

    // 1. Tes Browser & OS
    try {
      const { name, version } = uaResult.browser;
      const osName = uaResult.os.name;
      const majorVersion = parseInt(version, 10);

      const isChrome = name.includes("Chrome") || name.includes("CriOS");
      const isSafari = name.includes("Safari");

      let isSupported = false;
      let browserDetails = `${name} v${version} di ${osName}`;
      let browserSummary = "Browser Didukung";

      if (
        (isChrome && majorVersion >= 80) ||
        (isSafari && !isChrome && majorVersion >= 14)
      ) {
        isSupported = true;
      } else {
        if (isChrome || isSafari) {
          browserSummary = "Versi Browser Tidak Didukung";
          browserDetails += ". Mohon update browser Anda ke versi terbaru.";
        } else {
          browserSummary = "Browser Tidak Didukung";
          browserDetails += ". Mohon gunakan Google Chrome atau Safari.";
        }
      }
      tempResults.browser = {
        pass: isSupported,
        summary: browserSummary,
        details: browserDetails,
      };
    } catch (e) {
      tempResults.browser = {
        pass: false,
        summary: "Gagal Deteksi Browser",
        details: e.message,
      };
    }
    setResults((prev) => ({ ...prev, browser: tempResults.browser }));

    // 2. Tes Konektivitas Jaringan
    try {
      const res = await fetch("/api/ping");
      if (res.ok) {
        tempResults.network = {
          pass: true,
          summary: "Koneksi Berhasil",
          details: "Berhasil terhubung ke server ujian.",
        };
      } else {
        throw new Error(`Server merespons dengan status ${res.status}.`);
      }
    } catch (e) {
      tempResults.network = {
        pass: false,
        summary: "Koneksi Gagal",
        details: e.message || "Periksa koneksi internet Anda.",
      };
    }
    setResults((prev) => ({ ...prev, network: tempResults.network }));

    // 3. Mengirim laporan ke Webhook
    const finalPayload = {
      email: email || "Tidak terdeteksi",
      checkTimestamp: new Date().toISOString(),
      userAgent: uaResult.ua,
      results: {
        media: {
          pass: true,
          summary: "Media Terdeteksi",
          details: "Kamera & Mikrofon berhasil diakses.",
        },
        ...tempResults,
      },
    };

    try {
      const response = await fetch("/api/submit-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      if (!response.ok) throw new Error("Server API gagal mengirim laporan.");
      setResults((prev) => ({
        ...prev,
        submission: {
          pass: true,
          summary: "Pengiriman Laporan Berhasil",
          details: "Hasil pengecekan telah dicatat.",
        },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        submission: {
          pass: false,
          summary: "Pengiriman Laporan Gagal",
          details: error.message,
        },
      }));
    }

    setIsChecking(false);
  };

  const handleStartCheck = async () => {
    setIsChecking(true);
    setResults(initialResultsState);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      setResults((prev) => ({
        ...prev,
        media: {
          pass: true,
          summary: "Media Terdeteksi",
          details: "Kamera & Mikrofon berhasil diakses.",
        },
      }));
      await runRemainingChecksAndSubmit();
    } catch (e) {
      let summary = "Akses Media Gagal";
      let details = "Terjadi kesalahan saat mengakses kamera atau mikrofon.";
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        details =
          "Anda telah menolak izin akses ke kamera & mikrofon. Mohon izinkan untuk melanjutkan.";
      } else if (e.name === "NotFoundError") {
        details =
          "Tidak ada perangkat kamera atau mikrofon yang ditemukan di perangkat Anda.";
      }
      setResults((prev) => ({
        ...prev,
        media: { pass: false, summary, details },
      }));
      setIsChecking(false);
    }
  };

  const allChecksPassed =
    results.media?.pass &&
    results.browser?.pass &&
    results.network?.pass &&
    results.submission?.pass;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4 transition-all duration-500">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-10 transform transition-all duration-500 ease-in-out">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-slate-800">
              Device Check
            </h1>
            <p className="text-slate-500 mt-2">
              Pastikan perangkat Kamu siap sebelum hari ujian.
            </p>
          </div>

          <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Email Peserta
            </label>
            <p className="md:text-lg font-semibold text-slate-800 truncate">
              {email ||
                "Tidak ada email di URL (tambahkan ?email=anda@email.com)"}
            </p>
          </div>

          {!(
            results.media ||
            results.browser ||
            results.network ||
            results.submission
          ) && (
            <button
              onClick={handleStartCheck}
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-3 md:text-lg font-bold bg-blue-600 text-white py-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 transform hover:-translate-y-1 disabled:bg-slate-400 disabled:transform-none"
            >
              {isChecking && <IconSpinner />}
              {isChecking
                ? "Meminta Izin Media..."
                : "Mulai Pengecekan Sekarang"}
            </button>
          )}

          <div className="space-y-4">
            {Object.entries(results).map(([key, result]) => {
              if (!result) return null;

              const checkNames = {
                media: "Akses Kamera & Mikrofon",
                browser: "Kompatibilitas Browser",
                network: "Koneksi Server",
                submission: "Pengiriman Laporan",
              };

              // ======================================================================
              // PERBAIKAN DI SINI: Menggunakan backtick (`) untuk seluruh className
              // ======================================================================
              return (
                <div
                  key={key}
                  className={`animate-fade-in p-4 border-l-4 rounded-r-lg flex items-start gap-4 transition-all duration-300 ${
                    result.pass
                      ? "bg-green-50 border-green-500"
                      : "bg-red-50 border-red-500"
                  }`}
                >
                  {result.pass ? <IconCheck /> : <IconX />}
                  <div>
                    <h3
                      className={`font-bold ${
                        result.pass ? "text-green-800" : "text-red-800"
                      }`}
                    >
                      {checkNames[key]}
                    </h3>
                    <p className="text-sm text-slate-600">{result.details}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {results.submission && (
            <div
              className={`animate-fade-in mt-8 py-5 px-3 md:p-5 rounded-lg text-center transition-all duration-500 ${
                allChecksPassed ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <h3
                className={`text-xl font-bold ${
                  allChecksPassed ? "text-green-800" : "text-red-800"
                }`}
              >
                {allChecksPassed
                  ? "✅ Perangkat Anda Siap!"
                  : "⚠️ Perangkat Belum Siap"}
              </h3>
              <p
                className={`mt-2 ${
                  allChecksPassed ? "text-green-700" : "text-red-700"
                }`}
              >
                {allChecksPassed
                  ? "Semua sistem berfungsi normal. Kamu siap untuk ujian."
                  : "Ada masalah yang terdeteksi. Mohon perbaiki sesuai pesan di atas atau siapkan perangkat lain."}
              </p>
            </div>
          )}
        </div>

        <footer className="text-center mt-8 text-slate-500 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Act Study. All rights reserved.
          </p>
        </footer>
      </div>
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
