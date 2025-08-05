import React from "react";

function IntroScreen({ isAgreed, onAgreeChange, onStartExam, config }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-18 px-4 modal">
      <img
        src="/actstudy_logo.png"
        className="w-52 rounded-top mx-auto mb-8"
        alt="Act Study Logo"
      />
      <div className="text-slate-700 bg-white p-6 rounded shadow-lg max-w-md w-full">
        <h1 className="pb-4 border-b-2 text-2xl font-bold mb-4 text-center">
          TES SINGKAT
          <br />
          JLPT N5
        </h1>
        <p className="pb-4 mb-4 text-center font-semibold  border-b-2">
          Jumlah Soal : 50 Soal
          <br />
          Batas Waktu : 30 Menit
        </p>
        <p className="mb-2 font-bold text-center text-red-500">
          Penting! <br /> Baca Sebelum Memulai
        </p>
        <ul className="text-sm mb-6 text-justify">
          <li>
            🔹Gunakan browser
            <strong className="text-blue-500">
              {" "}
              **Google Chrome**
            </strong> atau{" "}
            <strong className="text-blue-500"> **Safari**</strong> saat
            mengerjakan tes ini.
          </li>
          <li>
            🔹Pastikan perangkat dan lingkungan Anda siap untuk melaksanakan tes
            selama 30 menit.
          </li>
          <li>
            🔹Tes ini tidak bisa dijeda atau dilanjutkan jika halaman (tab)
            browser ditutup ataupun reload.
          </li>
          <li>🔹Segala bentuk percobaan kecurangan tidak bisa ditoleransi.</li>
        </ul>
        <p className="text-sm mb-3 text-justify">
          Sistem dan aplikasi ujian ini dirancang sedemikian rupa untuk mencegah
          terjadinya kecurangan.
        </p>
        <ul className="text-sm mb-4 text-justify">
          <li>
            🔹Wajah dan Suara di sekitar Anda akan direkam melalui Kamera depan
            perangkat Anda selama pengerjaan tes. Tolong
            <strong> izinkan penggunaan Kamera dan Mikrofon</strong>.
          </li>
          <li>
            🔹Tindakan berpindah ke tab browser lain atau membuka aplikasi lain
            selama pengerjaan tes akan dicatat oleh sistem sehingga dinyatakan
            sebagai percobaan tindak kecurangan.
          </li>
        </ul>

        <p className="text-sm mb-8 text-justify">
          Silakan dikerjakan dengan baik dan jujur. Good Luck!
        </p>
        <div className="bg-sky-50 border-l-4 border-sky-500 p-4 rounded-md mb-6">
          <label className="flex items-start cursor-pointer">
            {/* Checkbox asli yang disembunyikan */}
            <input
              type="checkbox"
              id="agreement"
              checked={isAgreed}
              onChange={onAgreeChange}
              className="absolute opacity-0 h-0 w-0"
            />

            {/* Checkmark Kustom */}
            <span
              className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 flex items-center justify-center border-2 rounded transition-colors duration-200
          ${
            isAgreed ? "bg-sky-600 border-sky-600" : "bg-white border-slate-400"
          }`}
            >
              {isAgreed && (
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </span>

            {/* [PERBAIKAN KUNCI] Teks label dibungkus dalam span agar menjadi flex item yang rapi */}
            <span className="text-slate-700 text-sm">
              Saya mengerti instruksi dan petunjuk di atas.
            </span>
          </label>
          <p className="text-xs text-slate-500 mt-2">
            ※ Kamu harus mencentang kotak ini untuk dapat memulai.
          </p>
        </div>

        <button
          onClick={onStartExam}
          className={`w-full py-2 font-bold bg-blue-600 text-white rounded hover:bg-blue-800 transition-all ease-in ${
            !isAgreed ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!isAgreed}
        >
          Mulai
        </button>
      </div>
    </div>
  );
}

export default IntroScreen;
