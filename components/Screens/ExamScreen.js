import React from "react";

function ExamScreen({
  qs,
  ans,
  setAns,
  cur,
  setCur,
  timeLeft,
  progress,
  videoRef,
  stream,
  renderRubySegment,
  openQuestionMapModal,
  onInitiateSubmit,
  formatHMS,
  totalQuestions,
}) {
  return (
    <div className="p-2 md:p-4 w-full max-w-3xl mx-auto modal">
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold mb-2">JLPT N5 Tes Singkat</h2>
          <div className="relative w-52 bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
            <span className="text-center  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold text-sm">
              {formatHMS(timeLeft)}
            </span>
          </div>
        </div>
        <div className="relative w-32 h-24 rounded border-2 border-slate-700 shadow-lg overflow-hidden bg-gray-800">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]" // Video akan mengisi penuh wrapper div
          />

          <div className="absolute top-1 right-1 z-10 flex items-center bg-black bg-opacity-50 rounded px-1 py-0.5">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-1"></div>
            <span className="text-white text-xs font-bold">REC</span>
          </div>
        </div>
      </div>
      <div className="bg-white p-4 md:p-6 rounded shadow-lg">
        <div className="mb-8 ">
          {/* Question Number */}
          <p className="text-sm text-gray-600 mb-2">
            Soal {cur + 1} dari {totalQuestions}
          </p>
          {qs[cur]?.desc && (
            <p className="mb-3 text-gray-700 text-sm md:text-lg">
              {qs[cur].desc}
            </p>
          )}
          {/* Teks Pertanyaan Utama */}
          <h3 className="mb-4 text-gray-900 font-semibold md:text-lg">
            {qs[cur]?.q &&
              (Array.isArray(qs[cur].q)
                ? qs[cur].q.map((seg, idx) => renderRubySegment(seg, idx))
                : qs[cur].q)}
          </h3>
          {/* Daftar Opsi Jawaban (dengan dekorasi radio button) */}
          {qs[cur]?.options?.map((opt, oi) => (
            <label
              key={oi}
              className={`
        block mb-3 p-3 rounded border transition-all duration-200 ease-in-out
        cursor-pointer
        ${
                ans[cur] === oi
                  ? "bg-blue-100 border-blue-500 shadow-md" // Style saat dipilih
                  : "bg-white border-gray-300 hover:bg-gray-100" // Style saat tidak dipilih/hover
              }
        flex items-start
      `}
            >
              <input
                type="radio"
                name={`q${cur}`} // Penting: Pastikan name unik per soal agar pilihan hanya 1
                checked={ans[cur] === oi}
                onChange={() => setAns((a) => ({ ...a, [cur]: oi }))}
                className="sr-only peer"
                // sr-only: sembunyikan visual; peer: beri nama untuk styling sibling
              />
              <div
                className={`
          w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0 mt-0.5 {/* mt-0.5: sedikit geser ke bawah */}
          peer-checked:border-blue-600 peer-checked:bg-blue-600 {/* Style saat input peer dicentang */}
          border-gray-400 bg-white {/* Style default */}
          transition-all duration-200 ease-in-out
        `}
              >
                {/* Dot di dalam ikon radio custom (muncul saat dicentang) */}
                <div
                  className={`
            w-2 h-2 rounded-full bg-white transform scale-0 
            peer-checked:scale-100 
            transition-all duration-200 ease-in-out
          `}
                ></div>
              </div>
              <span className="text-gray-900 flex-grow">
                {Array.isArray(opt)
                  ? opt.map((seg, idx) => renderRubySegment(seg, idx))
                  : opt}
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-center items-center gap-2 ">
          <button
            onClick={() => cur > 0 && setCur((c) => c - 1)}
            disabled={cur === 0}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 transition-all duration-150 ease-in text-white rounded disabled:opacity-50"
          >
            <svg
              width="24px"
              height="24px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              stroke="currentColor"
              strokeWidth="0.5"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.7071 4.29289C16.0976 4.68342 16.0976 5.31658 15.7071 5.70711L9.41421 12L15.7071 18.2929C16.0976 18.6834 16.0976 19.3166 15.7071 19.7071C15.3166 20.0976 14.6834 20.0976 14.2929 19.7071L7.29289 12.7071C7.10536 12.5196 7 12.2652 7 12C7 11.7348 7.10536 11.4804 7.29289 11.2929L14.2929 4.29289C14.6834 3.90237 15.3166 3.90237 15.7071 4.29289Z"
                  fill="currentColor"
                ></path>
              </g>
            </svg>
          </button>
          <button
            onClick={openQuestionMapModal}
            className="px-6 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 transition-all duration-200"
          >
            <svg
              width="24px"
              height="24px"
              viewBox="0 -35 1094 1094"
              fill="currentColor"
              className="icon"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <path d="M1094.365815 508.821712c0-17.000144-9.756605-32.522015-25.130648-39.913382l-148.418652-71.400607 148.418652-71.400606c15.374044-7.391367 25.130648-22.913238 25.130648-39.913382s-9.756605-32.522015-25.130648-39.913383L566.326548 4.43482c-12.121842-5.913094-26.313267-5.913094-38.435109 0L25.130648 246.280352c-15.374044 7.391367-25.130648 22.913238-25.130648 39.913383s9.756605 32.522015 25.130648 39.913382l148.418652 71.400606L25.130648 468.90833c-15.374044 7.391367-25.130648 22.913238-25.130648 39.913382s9.756605 32.522015 25.130648 39.913383l155.070882 74.50498L25.130648 697.892883c-15.374044 7.391367-25.130648 22.913238-25.130648 39.913382s9.756605 32.522015 25.130648 39.913383l502.760791 241.845532c6.060921 2.956547 12.713151 4.43482 19.217555 4.43482s13.156633-1.478273 19.217554-4.43482l502.760791-241.845532c15.374044-7.391367 25.130648-22.913238 25.130649-39.913383s-9.756605-32.522015-25.130649-39.913382l-155.070882-74.504981 155.070882-74.50498c15.521871-7.391367 25.278476-22.913238 25.278476-40.06121zM547.108994 93.574708L947.573264 286.193735 547.108994 478.812762 146.644724 286.193735 547.108994 93.574708zM947.573264 737.806265L547.108994 930.425292 146.644724 737.806265l135.7055-65.339685 245.541215 118.114047c6.060921 2.956547 12.713151 4.43482 19.217555 4.43482s13.156633-1.478273 19.217554-4.43482l245.541216-118.114047 135.7055 65.339685z m-400.46427-36.365526L146.644724 508.821712l129.201097-62.087484 252.045618 121.218421c6.060921 2.956547 12.713151 4.43482 19.217555 4.43482s13.156633-1.478273 19.217554-4.43482l252.045619-121.218421 129.201097 62.087484-400.46427 192.619027z"></path>
              </g>
            </svg>
          </button>
          <button
            onClick={() =>
              cur < totalQuestions - 1
                ? setCur((c) => c + 1)
                : onInitiateSubmit()
            }
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 transition-all duration-150 ease-in text-white rounded flex items-center"
          >
            {cur < totalQuestions - 1 ? (
              <svg
                width="24px"
                height="24px"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                stroke="#ffffff"
                strokeWidth="0.5"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M8.29289 4.29289C8.68342 3.90237 9.31658 3.90237 9.70711 4.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L9.70711 19.7071C9.31658 20.0976 8.68342 20.0976 8.29289 19.7071C7.90237 19.3166 7.90237 18.6834 8.29289 18.2929L14.5858 12L8.29289 5.70711C7.90237 5.31658 7.90237 4.68342 8.29289 4.29289Z"
                    fill="#ffffff"
                  ></path>
                </g>
              </svg>
            ) : (
              <>
                <span className="mr-2">Submit</span>
                <svg
                  width="24px"
                  height="24px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="#ffffff"
                  strokeWidth="0.5"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8.29289 4.29289C8.68342 3.90237 9.31658 3.90237 9.70711 4.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L9.70711 19.7071C9.31658 20.0976 8.68342 20.0976 8.29289 19.7071C7.90237 19.3166 7.90237 18.6834 8.29289 18.2929L14.5858 12L8.29289 5.70711C7.90237 5.31658 7.90237 4.68342 8.29289 4.29289Z"
                      fill="#ffffff"
                    ></path>
                  </g>
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExamScreen;
