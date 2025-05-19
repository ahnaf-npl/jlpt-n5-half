import React from "react";

function AuthErrorModal({ isOpen, isClosing, errorMessage, onClose }) {
  // Komponen tidak perlu merender apa pun jika tidak terbuka
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`overlay-bg fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 ${
        isClosing ? "overlay-out" : "overlay"
      }`}
    >
      <div
        className={`w-xl mx-2 bg-white p-6 rounded shadow modal text-center ${
          isClosing ? "modal-out" : "modal"
        }`}
      >
        <h2 className="text-xl font-bold mb-4 text-red-500">
          Autentikasi Gagal
        </h2>
        <p className="text-slate-800">{errorMessage}</p>
        <button
          className="px-4 py-2 bg-slate-300 text-slate-700 rounded mt-4 hover:bg-slate-400 transition-colors ease-in"
          onClick={onClose}
        >
          Tutup
        </button>
      </div>
    </div>
  );
}

export default AuthErrorModal;
