// pages/index.js
import { useState, useEffect, useRef } from "react";

/* 60 soal (20 × 3 level) */
/* Catatan:
   – Level 1 = Minna no Nihongo Bab 1-10
   – Level 2 = Bab 11-20
   – Level 3 = Bab 21 ke atas
   – Setiap soal punya 4 pilihan, huruf Kanji menyesuaikan bab.
*/

/* 60問（各レベル20問）すべて日本語 */

const QUESTIONS = {
  /* ────────── Level 1 (みんなの日本語 第1–10課) ────────── */
  1: [
    {
      q: "わたし＿＿インドネシアじんです。",
      options: ["は", "が", "を", "で"],
      answer: "は",
    },
    {
      q: "これは＿＿かばんです。",
      options: ["あたらしい", "あおい", "ながい", "きびしい"],
      answer: "あたらしい",
    },
    {
      q: "ぎんこうは＿＿です。",
      options: ["あそこ", "これ", "いつ", "だれ"],
      answer: "あそこ",
    },
    {
      q: "わたしは＿＿６じにおきます。",
      options: ["まいあさ", "きのう", "まいばん", "らいしゅう"],
      answer: "まいあさ",
    },
    {
      q: "きょうは＿＿てんきですね。",
      options: ["いい", "にぎやかな", "きれいな", "べんりな"],
      answer: "いい",
    },
    {
      q: "かさはつくえ＿＿うえにあります。",
      options: ["の", "で", "を", "へ"],
      answer: "の",
    },
    {
      q: "＿＿はなんですか。―ほんです。",
      options: ["これ", "いつ", "あそこ", "あなた"],
      answer: "これ",
    },
    {
      q: "９じ＿＿はたらきます。",
      options: ["から", "まで", "に", "で"],
      answer: "から",
    },
    {
      q: "きのう＿＿えいがをみましたか。",
      options: ["だれと", "どこで", "なにを", "どう"],
      answer: "だれと",
    },
    {
      q: "わたしはにほんごを＿＿べんきょうします。",
      options: ["まいにち", "まいしゅう", "らいねん", "せんげつ"],
      answer: "まいにち",
    },
    {
      q: "テレビを＿＿ください。",
      options: ["けして", "けす", "けしました", "けさ"],
      answer: "けして",
    },
    {
      q: "でんわばんごうは＿＿ですか。",
      options: ["なんばん", "なにばん", "いつばん", "どこばん"],
      answer: "なんばん",
    },
    {
      q: "わたしはコーヒー＿＿のみません。",
      options: ["は", "も", "を", "で"],
      answer: "は",
    },
    {
      q: "にちようび＿＿やすみます。",
      options: ["に", "で", "を", "へ"],
      answer: "に",
    },
    {
      q: "「ありがとう」＿＿いいます。",
      options: ["と", "を", "に", "で"],
      answer: "と",
    },
    {
      q: "いま＿＿ですか。―２じです。",
      options: ["なんじ", "なんにち", "なんようび", "なんさい"],
      answer: "なんじ",
    },
    {
      q: "たなかさんは＿＿ひとですか。",
      options: ["どんな", "どう", "いくら", "どれ"],
      answer: "どんな",
    },
    {
      q: "＿＿ノートですか。―わたしのです。",
      options: ["だれの", "どこ", "どれ", "いつ"],
      answer: "だれの",
    },
    {
      q: "あのかたはさとうさん＿＿。",
      options: ["です", "ます", "でした", "ません"],
      answer: "です",
    },
    {
      q: "デパートは９じ＿＿５じまでです。",
      options: ["から", "で", "へ", "まで"],
      answer: "まで",
    },
  ],

  /* ────────── Level 2 (第11–20課) ────────── */
  2: [
    {
      q: "くつを＿＿から、へやに入ってください。",
      options: ["ぬいで", "ぬぎ", "ぬぐ", "ぬいだ"],
      answer: "ぬいで",
    },
    {
      q: "「たべます」のたいけいは＿＿。",
      options: ["たべたい", "たべやすい", "たべにくい", "たべられる"],
      answer: "たべたい",
    },
    {
      q: "へやをそうじしてから、＿＿をききました。",
      options: ["おんがく", "えいが", "でんわ", "えはがき"],
      answer: "おんがく",
    },
    {
      q: "あつくて＿＿かわきました。",
      options: ["のどが", "あしが", "くちが", "めが"],
      answer: "のどが",
    },
    {
      q: "ここでしゃしんを＿＿ください。",
      options: ["とらないで", "とって", "とり", "とれ"],
      answer: "とらないで",
    },
    {
      q: "駅でともだちを＿＿いました。",
      options: ["まって", "まち", "まちに", "まった"],
      answer: "まって",
    },
    {
      q: "このみちはひろくて、＿＿がおおいです。",
      options: ["くるま", "ひと", "いぬ", "みせ"],
      answer: "くるま",
    },
    {
      q: "「えいが」の漢字はどれですか。",
      options: ["映画", "泳画", "映画館", "英語"],
      answer: "映画",
    },
    {
      q: "バスにのって、つぎのえきで＿＿。",
      options: ["おります", "のります", "おりますか", "のりません"],
      answer: "おります",
    },
    {
      q: "ラーメンを＿＿です。",
      options: ["たべたい", "たべて", "たべます", "たべられます"],
      answer: "たべたい",
    },
    {
      q: "ねむかったので、ソファで＿＿しまいました。",
      options: ["ねて", "ねていて", "ねていても", "ねて"],
      answer: "ねて",
    },
    {
      q: "かさをわすれたから、＿＿になりました。",
      options: ["びしょぬれ", "かんそう", "すずしい", "げんき"],
      answer: "びしょぬれ",
    },
    {
      q: "あまくてとても＿＿です。",
      options: ["おいしい", "にがい", "しょっぱい", "まずい"],
      answer: "おいしい",
    },
    {
      q: "＿＿でほんをかりて、すぐかえしました。",
      options: ["としょかん", "えき", "こうえん", "ぎんこう"],
      answer: "としょかん",
    },
    {
      q: "パーティーに＿＿ですから、はやくかえります。",
      options: ["いきます", "いきたい", "いけません", "いきません"],
      answer: "いきます",
    },
    {
      q: "でんきを＿＿ください。",
      options: ["つけて", "けして", "けし", "つける"],
      answer: "つけて",
    },
    {
      q: "「まいあさジョギングをする」ことばをえらんでください。",
      options: ["しゅうかん", "くせ", "ゆめ", "うそ"],
      answer: "しゅうかん",
    },
    {
      q: "あさごはんを＿＿あとで、さんぽします。",
      options: ["たべた", "たべない", "たべて", "たべながら"],
      answer: "たべた",
    },
    {
      q: "バスがこないので、あるいて＿＿。",
      options: ["いきました", "いきませんでした", "いきます", "いけます"],
      answer: "いきました",
    },
    {
      q: "にわは＿＿くてしずかです。",
      options: ["ひろ", "ひろい", "ひろく", "ひろかった"],
      answer: "ひろく",
    },
  ],

  /* ────────── Level 3 (第21課以上) ────────── */
  3: [
    {
      q: "忘れない＿＿、メモをします。",
      options: ["ように", "ために", "ことに", "あいだに"],
      answer: "ように",
    },
    {
      q: "もし時間が＿＿、手伝ってください。",
      options: ["あったら", "あれば", "あるなら", "あって"],
      answer: "あったら",
    },
    {
      q: "日本へ行く＿＿です。",
      options: ["つもり", "こと", "よう", "ため"],
      answer: "つもり",
    },
    {
      q: "電車が遅れた＿＿、会議に遅れました。",
      options: ["ので", "でも", "しか", "ながら"],
      answer: "ので",
    },
    {
      q: "風をひかない＿＿、マスクをします。",
      options: ["ように", "ことに", "ために", "あいだに"],
      answer: "ように",
    },
    {
      q: "資料を＿＿あとで、メールします。",
      options: ["送った", "送る", "送って", "送り"],
      answer: "送った",
    },
    {
      q: "会議で使う資料は＿＿にコピーしましたか。",
      options: ["もう", "まだ", "いつも", "ときどき"],
      answer: "もう",
    },
    {
      q: "漢字 地震 の読み方はどれですか。",
      options: ["じしん", "しじん", "じさん", "じせん"],
      answer: "じしん",
    },
    {
      q: "コーヒーを飲みすぎた＿＿、眠れませんでした。",
      options: ["ので", "のに", "から", "ても"],
      answer: "ので",
    },
    {
      q: "夜おそくまで働くことが＿＿。",
      options: ["あります", "います", "なります", "できます"],
      answer: "あります",
    },
    {
      q: "日本へ行ったことが＿＿か。",
      options: ["あります", "います", "なります", "できます"],
      answer: "あります",
    },
    {
      q: "出口に＿＿ください。",
      options: ["集まって", "集まる", "集まり", "集まった"],
      answer: "集まって",
    },
    {
      q: "作文は先生に＿＿ました。",
      options: ["直され", "直し", "直す", "直されて"],
      answer: "直され",
    },
    {
      q: "きれいな景色を写真に＿＿ことがありますか。",
      options: ["撮った", "取った", "書いた", "買った"],
      answer: "撮った",
    },
    {
      q: "りょこうに＿＿かどうか、聞いてみます。",
      options: ["行ける", "行く", "行った", "行き"],
      answer: "行ける",
    },
    {
      q: "もう少し大きい声で＿＿いただけませんか。",
      options: ["話して", "話し", "話す", "話したら"],
      answer: "話して",
    },
    {
      q: "これは使い方がむずかしいと＿＿。",
      options: ["思います", "言います", "聞きます", "書きます"],
      answer: "思います",
    },
    {
      q: "山田さんは旅行が好き＿＿、毎年外国へ行きます。",
      options: ["なので", "でも", "しか", "ながら"],
      answer: "なので",
    },
    {
      q: "雨がやんだら、＿＿に出かけましょう。",
      options: ["さんぽ", "しごと", "べんきょう", "かいもの"],
      answer: "さんぽ",
    },
    {
      q: "レポートは明日までに＿＿なりません。",
      options: ["出さなければ", "出して", "出さないで", "出します"],
      answer: "出さなければ",
    },
  ],
};

export default function Home() {
  const [step, setStep] = useState("intro");
  const [level, setLevel] = useState(null);
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState({});
  const [cur, setCur] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recorderRef = useRef(null);
  const videoRef = useRef(null);
  const chunksRef = useRef([]);
  const misuseEventsRef = useRef([]);
  const [stream, setStream] = useState(null);
  const [params, setParams] = useState({ email: "", id: "" });

  // Baca URL params
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setParams({ email: p.get("email") || "", id: p.get("id") || "" });
  }, []);

  // Timer for exam
  useEffect(() => {
    let iv;
    if (step === "exam") {
      iv = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(iv);
            submitExam();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(iv);
  }, [step]);

  // Attach visibility and blur/focus listeners during exam for flagging
  useEffect(() => {
    function handleVisibility() {
      misuseEventsRef.current.push({
        event: "visibilitychange",
        state: document.visibilityState,
        time: new Date().toLocaleString(),
      });
    }
    function handleBlur() {
      misuseEventsRef.current.push({
        event: "blur",
        time: new Date().toLocaleString(),
      });
    }
    function handleFocus() {
      misuseEventsRef.current.push({
        event: "focus",
        time: new Date().toLocaleString(),
      });
    }
    if (step === "exam") {
      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("blur", handleBlur);
      window.addEventListener("focus", handleFocus);
    }
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [step]);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Begin: request permission before progressing
  async function begin() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // stop immediately after permission granted
      s.getTracks().forEach((track) => track.stop());
      setStep("level");
    } catch (e) {
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        alert(
          "Anda telah menolak izin kamera & mikrofon. Silakan izinkan akses di pengaturan situs (klik ikon gembok di address bar dan izinkan Kamera & Mikrofon)."
        );
      } else {
        alert("Izin kamera & mikrofon diperlukan untuk melanjutkan.");
      }
    }
  }

  function pickLevel(lv) {
    setLevel(lv);
    misuseEventsRef.current = [];
    const arr = [...QUESTIONS[lv]].sort(() => 0.5 - Math.random()).slice(0, 5);
    setQs(arr);
    setStep("exam");
    startRecording();
  }

  function selectOption(opt) {
    setAns((a) => ({ ...a, [cur]: opt }));
  }

  function nextQ() {
    if (cur < qs.length - 1) setCur((c) => c + 1);
    else submitExam();
  }

  async function startRecording() {
    const s = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setStream(s);
    const rec = new MediaRecorder(s, { mimeType: "video/webm" });
    rec.ondataavailable = (e) => chunksRef.current.push(e.data);
    rec.start();
    recorderRef.current = rec;
  }

  function getFileNameTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return (
      [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join(
        "-"
      ) +
      "_" +
      [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join(
        "-"
      )
    );
  }
  function getSubmitTimeData() {
    return new Date().toLocaleString();
  }

  async function submitExam() {
    if (recorderRef.current?.state !== "inactive") {
      setIsSubmitting(true);
      recorderRef.current.stop();
      recorderRef.current.onstop = async () => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          setStream(null);
        }
        const flags = misuseEventsRef.current;
        const correct = qs.filter((q, i) => ans[i] === q.answer).length;
        const score = Math.round((correct / qs.length) * 100);
        const submitFileTimestamp = getFileNameTimestamp();
        const submitTimeData = getSubmitTimeData();
        const responses = qs.map((q, i) => ({
          question: q.q,
          answer: ans[i] || "",
        }));

        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const filename = `quiz_${submitFileTimestamp}.webm`;
        const file = new File([blob], filename, { type: "video/webm" });

        const fd = new FormData();
        fd.append("file", file);
        fd.append("email", params.email);
        fd.append("id", params.id);
        fd.append("level", level);
        fd.append("score", score);
        fd.append("submitTime", submitTimeData);
        fd.append("responses", JSON.stringify(responses));
        fd.append("flags", JSON.stringify(flags));

        try {
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error(await res.text());
          setIsSubmitting(false);
          setStep("result");
        } catch (e) {
          console.error("Submit error:", e);
          setIsSubmitting(false);
          alert("Gagal mengirim data. Coba lagi.");
        }
      };
    }
  }

  // Compute final score for result
  const finalScore = Math.round(
    (qs.filter((q, i) => ans[i] === q.answer).length / (qs.length || 1)) * 100
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 relative overflow-hidden select-none">
      <style jsx>{`
        .overlay {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .overlay-hide {
          animation: fadeOut 0.3s ease-out forwards;
        }
        .modal {
          animation: zoomIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        @keyframes zoomIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* Loading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overlay">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center modal">
            <svg
              className="animate-spin h-8 w-8 text-blue-600 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
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
            <p className="text-gray-800">Memproses, mohon tunggu...</p>
          </div>
        </div>
      )}

      {/* Intro */}
      {step === "intro" && (
        <div className="flex flex-col items-center justify-center h-full p-4 transition-opacity duration-300 opacity-100 modal">
          <img
            src="/logo_yoko.png"
            className="w-64 img-fluid rounded-top mx-auto mb-4"
            alt="Logo Yoko"
          />
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h1 className="pb-4 border-b-2 text-2xl font-bold mb-4 text-gray-900 text-center">
              TES SINGKAT <br /> BAHASA JEPANG
            </h1>
            <p className="mb-6 text-gray-700 text-justify">
              Guna mencegah terjadinya kecurangan, wajah Anda akan direkam
              melalui Kamera depan perangkat Anda selama pengerjaan tes. Tolong
              <strong> izinkan penggunaan Kamera dan Mikrofon</strong>. Silakan
              dikerjakan dengan baik dan jujur.
              <strong> がんばってください！＞＜</strong>
            </p>
            <button
              onClick={begin}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Mulai
            </button>
          </div>
        </div>
      )}

      {/* Level */}
      {step === "level" && (
        <div className="flex flex-col items-center justify-center h-full p-4 transition-opacity duration-300 opacity-100 modal">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Pilih Level
            </h2>
            <p className="mb-2 text-gray-700 text-justify">
              Pilih level tes sesuai dengan nilai
              <strong> "JLPT N5 Tes Singkat"</strong> yang Kamu kerjakan di
              aplikasi Act Study.
            </p>
            <ul className="text-left mb-6">
              <li>Level 1 : Kurang dari 50%</li>
              <li>Level 2 : 51% sampai 79%</li>
              <li>Level 3 : Lebih dari 80%</li>
            </ul>
            <div className="space-x-2">
              {[1, 2, 3].map((lv) => (
                <button
                  key={lv}
                  onClick={() => pickLevel(lv)}
                  className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 transition-all duration-150 ease-in"
                >
                  Level {lv}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Exam */}
      {step === "exam" && (
        <div className="p-4 transition-opacity duration-300 opacity-100 modal">
          <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium text-gray-900">
                Waktu tersisa:{" "}
                {`${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(
                  2,
                  "0"
                )}`}
              </span>
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-32 h-24 rounded border"
              />
            </div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              Soal {cur + 1}: {qs[cur].q}
            </h3>
            <div className="space-y-2">
              {qs[cur].options.map((o) => (
                <label key={o} className="flex items-center text-gray-900">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={ans[cur] === o}
                    onChange={() => selectOption(o)}
                  />
                  <span>{o}</span>
                </label>
              ))}
            </div>
            <button
              onClick={nextQ}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {cur < qs.length - 1 ? "Next" : "Submit"}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {step === "result" && (
        <div className="flex flex-col items-center justify-center h-full p-4 transition-opacity duration-300 opacity-100 modal">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Hasil Ujian
            </h2>
            <p className="text-lg mb-4 text-gray-900">
              Nilai Anda: {finalScore} / 100
            </p>
            <p className="text-gray-700">
              Terima kasih — data dan video telah terkirim.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
