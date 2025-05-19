import React from "react";

function ConfirmSubmitModal({ isOpen, isClosing, onCancel, onConfirm }) {
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
        className={`bg-white p-4 md:p-6 rounded-lg shadow-xl modal flex flex-col items-center text-center w-11/12 max-w-sm gap-6 ${
          isClosing ? "modal-out" : "modal"
        }`}
      >
        <h2 className="text-xl font-bold text-gray-800">Konfirmasi</h2>
        <p className="text-gray-700">
          Apakah Anda yakin ingin mengakhiri tes dan mengirimkan jawaban?
        </p>
        <div className="flex justify-center gap-2 w-full">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-2 bg-red-600 text-slate-200 rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Tidak
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Ya
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmSubmitModal;
