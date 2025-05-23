import React from "react";

function ResultScreen({
  finalScore, // Digunakan untuk menampilkan skor dan logika lulus/tidak lulus
  submitTimeString, // Digunakan untuk menampilkan waktu submit
  elapsed, // Digunakan untuk menampilkan durasi pengerjaan
  formatHMS, // Fungsi helper untuk format waktu (digunakan untuk durasi)
  onRetry, // Handler fungsi untuk mengulang ujian (dipanggil dari tombol)
}) {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen px-2 text-white">
      <img
        src="/actstudy_logo.png"
        className="w-52 rounded-top mx-auto mb-8"
        alt="Act Study Logo"
      />
      <div
        className={`bg-white border-t-4 p-8 rounded-lg shadow-lg text-center max-w-xl w-full text-gray-800 transform transition-all duration-500 ease-out scale-100 opacity-100 ${
          finalScore >= 50 ? "border-green-600" : "border-red-600" // Menggunakan prop finalScore
        }`}
      >
        <h2 className="text-3xl font-bold mb-6 text-slate-700">Hasil Tes</h2>
        {/* Larger title */}
        <div
          className={`text-5xl font-extrabold mb-6 ${
            finalScore >= 50 ? "text-green-600" : "text-red-600" // Menggunakan prop finalScore
          }`}
        >
          {finalScore}% {/* Menggunakan prop finalScore */}
        </div>
        {/* Pass/Fail Message */}
        <p
          className={`text-lg font-semibold mb-8 ${
            finalScore >= 50 ? "text-green-600" : "text-red-600" // Menggunakan prop finalScore
          }`}
        >
          {finalScore >= 50 // Menggunakan prop finalScore
            ? "Selamat, Anda Lulus!  Terus tingkatkan!"
            : "Anda Belum Lulus. Ayo belajar lagi!"}
        </p>
        <p className="mb-1 text-slate-700">
          Waktu Submit : {submitTimeString || "N/A"}
          {/* Menggunakan prop submitTime */}
        </p>
        <p className="text-slate-700">
          Durasi Pengerjaan : 
          {elapsed != null ? formatHMS(Math.floor(elapsed / 1000)) : "N/A"}
          {/* Menggunakan prop elapsed dan formatHMS */}
        </p>
        {finalScore < 50 && ( // Menggunakan prop finalScore
          <button
            onClick={onRetry} // Menggunakan prop onRetry yang disediakan parent
            className="mt-8 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors ease-in font-semibold shadow-md"
          >
            Kerjakan Ulang
          </button>
        )}
      </div>
    </div>
  );
}

export default ResultScreen;
