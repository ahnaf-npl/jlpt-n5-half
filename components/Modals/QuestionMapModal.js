import React from "react";

function QuestionMapModal({
  isOpen,
  isClosing,
  onClose,
  qs,
  ans,
  cur,
  setCur,
}) {
  // Komponen tidak perlu merender apa pun jika tidak terbuka
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
        isClosing ? "overlay-out" : "overlay"
      }`}
    >
      <div
        className={`flex flex-col w-xl mx-2 bg-white p-4 rounded shadow-lg max-h-screen overflow-y-auto ${
          isClosing ? "modal-out" : "modal"
        }`}
      >
        <h2 className="text-lg text-center font-bold mb-4">Peta Soal</h2>
        <div className="flex justify-center flex-wrap mb-4">
          {qs.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCur(i);
                onClose();
              }}
              className={`w-8 h-8 m-1 rounded flex items-center justify-center transition-all duration-200
                    ${ans[i] != null ? "bg-green-500" : "bg-gray-300"}
                    ${i === cur ? "ring-2 ring-green-500 scale-110" : ""}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-red-700 text-slate-200 rounded mt-4  hover:bg-red-800"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}

export default QuestionMapModal;
