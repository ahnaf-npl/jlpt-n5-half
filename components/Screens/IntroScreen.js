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
            <strong className="text-blue-500"> **Google Chrome**</strong> saat
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

        <div className="flex items-center mb-4">
          <label className="custom-checkbox-container">
            <input
              type="checkbox"
              id="agreement"
              checked={isAgreed}
              onChange={onAgreeChange}
            />
            <span className="checkmark"></span>
            Saya mengerti instruksi dan petunjuk di atas.
          </label>
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
