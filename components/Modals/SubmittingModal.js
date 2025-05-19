// components/Modals/SubmittingModal.jsx
import React from "react";

function SubmittingModal({ isOpen, isClosing }) {
  // Komponen tidak perlu merender apa pun jika tidak terbuka
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overlay ${
        isClosing ? "overlay-out" : "overlay"
      }`}
    >
      <div
        className={`bg-white p-8 rounded-lg shadow-xl modal flex flex-col items-center text-center w-11/12 max-w-sm gap-4 ${
          isClosing ? "modal-out" : "modal"
        }`}
      >
        <svg
          className="animate-spin h-10 w-10 text-blue-600"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            className="opacity-25"
          />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            className="opacity-75"
          />
        </svg>
        <p className="text-gray-800 text-lg font-semibold">データの処理中…</p>
      </div>
    </div>
  );
}

export default SubmittingModal;
