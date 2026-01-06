1. Gambaran Umum Project

Ini adalah web app ujian singkat JLPT N5 (50 soal, 30 menit) dengan:
• Pengacakan soal dari bank soal internal.
• Timer dan auto-submit saat waktu habis.
• Proctoring dasar: rekam wajah & suara via kamera/mikrofon, plus deteksi sebagian kecurangan (pindah tab, translate halaman).
• Integrasi eksternal:
• Cek apakah peserta sudah pernah ikut ujian (via Kintone).
• Cek kode unik untuk membuka akses jika sudah pernah ikut.
• Kirim hasil ujian + flag kecurangan + URL video ke Zapier webhook (untuk diteruskan ke sistem lain).
• Endpoint tambahan untuk kirim “check”/laporan ke Zapier.

Alur utama aplikasi diatur di pages/index.js, yang mengontrol 3 layar: Intro → Exam → Result. ￼

⸻

2. Tech Stack

Frontend
• Framework: Next.js (pages router)
• Halaman utama: pages/index.js
• API Routes: pages/api/\*.js
• UI Library: React function components + hooks (useState, useEffect, useRef, useCallback).
• Styling: Utility classes ala Tailwind (mis. bg-slate-200, flex, rounded-lg, w-full, dll) tersebar di semua screen.
• Notifikasi: react-hot-toast untuk toast loading/sukses/error selama proses cek riwayat, verifikasi kode, dsb. ￼
• Media / Proctoring:
• navigator.mediaDevices.getUserMedia (kamera + mic).
• MediaRecorder untuk rekaman segmented (per 3 menit, dijadwalkan tiap 10 menit).
￼

Backend (API Routes Next.js)
• pages/api/check-test-history.js – hit Kintone untuk cek apakah email sudah punya record tes tertentu. ￼
• pages/api/verify-unique-code.js – hit Kintone App lain untuk ambil unique_code dan validasi input user. ￼
• pages/api/submit-check.js – forward data pengecekan ke Zapier via ZAPIER_CHECK_WEBHOOK_URL. ￼
• pages/api/submitExam.js – kirim payload lengkap hasil ujian ke Zapier via ZAPIER_WEBHOOK_URL. (Ada import googleapis tapi belum dipakai). ￼
• pages/api/upload-segment.js – handle upload file video (segment hasil rekaman) dengan formidable, simpan ke public/videos/<id>/... lalu balikan URL publik. ￼

Catatan keamanan: token Kintone saat ini hard-coded di file API. Untuk production lebih aman kalau dipindah ke environment variable (.env).

⸻

3. Struktur UI & Komponen Utama

3.1. IntroScreen

File: components/Screens/IntroScreen.js ￼

Fungsi:
• Menampilkan judul tes “TES SINGKAT JLPT N5”, info 50 soal dan batas waktu 30 menit.
• Instruksi teknis (gunakan Chrome/Safari, tidak bisa pause, anti-cheating, rekam kamera & mic, dll).
• Checkbox persetujuan (“Saya mengerti instruksi…”) dengan custom styling; tombol “Mulai” hanya aktif jika sudah dicentang.
• Props:
• isAgreed, onAgreeChange – mengontrol checkbox.
• onStartExam – dipanggil ketika user klik “Mulai”.
• config – objek konfigurasi (tidak terlalu dipakai di tampilan, tapi siap kalau mau render dinamis).

3.2. ExamScreen

File: components/Screens/ExamScreen.js ￼

Fungsi:
• Header:
• Judul “JLPT N5 Tes Singkat”.
• Progress bar bundar memanjang dengan sisa waktu di tengah (pakai timeLeft, progress, formatHMS).
• Preview kamera di kanan atas dengan label REC merah (indikasi perekaman). videoRef di-attach ke <video>.
• Konten soal:
• Menampilkan nomor soal “Soal X dari Y”.
• qs[cur].desc (jika ada) ditampilkan sebagai deskripsi.
• qs[cur].q dirender:
• Jika berupa array segment ({ base, ruby }), diproses via renderRubySegment (untuk furigana).
• Jika string biasa, langsung ditampilkan.
• Opsi jawaban:
• Setiap opsi label <label> dengan radio custom (lingkaran + dot).
• ans[cur] === oi menentukan styling selected vs non-selected.
• Opsi juga mendukung bentuk segment array (furigana) atau string biasa.
• Navigasi:
• Tombol Prev (disabel di soal pertama).
• Tombol Question Map (peta soal) memanggil openQuestionMapModal.
• Tombol Next / Submit:
• Jika belum di soal terakhir → next soal.
• Jika di soal terakhir → panggil onInitiateSubmit() untuk buka confirm submit modal.

Props utama:
• Data: qs, ans, cur, totalQuestions, timeLeft, progress.
• Handler: setAns, setCur, openQuestionMapModal, onInitiateSubmit.
• Proctoring: videoRef, stream (tidak dipakai langsung di sini tapi disiapkan dari parent), renderRubySegment, formatHMS.

3.3. ResultScreen

File: components/Screens/ResultScreen.js ￼

Fungsi:
• Menampilkan:
• Logo actstudy_logo.png.
• Judul “Hasil Tes”.
• Skor besar (finalScore%) dengan warna hijau jika ≥ 50, merah jika < 50.
• Pesan “Lulus / Belum Lulus”.
• Waktu submit (submitTimeString).
• Durasi pengerjaan (hitungan detik → formatHMS).
• Jika finalScore < 50 muncul tombol “Kerjakan Ulang” yang memanggil onRetry (reset state dan kembali ke intro).

3.4. Home Page / Orkestrasi

File: pages/index.js – ini otak seluruh alur. ￼

State & ref utama:
• Flow & data:
• step: "intro" | "exam" | "result".
• qs: array soal terpilih & teracak.
• ans: object jawaban {indexSoal: indexOpsi}.
• cur: index soal aktif.
• timeLeft: waktu tersisa (detik).
• startTime, elapsed: waktu mulai & lama pengerjaan.
• scoreState: skor akhir.
• params: { email, id, tag } dari URL.
• UI/Modal:
• isSubmitting, isClosingSubmitting.
• authError, isClosingAuthError.
• isConfirmSubmitModalOpen, isClosingConfirm.
• isQuestionMapModalOpen, isClosingQuestionMap.
• Lock System:
• isLockModalOpen, isClosingLockModal.
• uniqueCodeInput, isVerifying.
• Browser support:
• isBrowserSupported.
• Submit info:
• submitTimeDisplay (untuk layar result).
• submitTimeForWebhook (untuk payload webhook).
• Proctoring:
• stream (MediaStream kamera+mic).
• recorderRef (MediaRecorder).
• videoRef (elemen video).
• segmentsRef (URL video hasil upload by segment).
• chunksRef (buffer blob per segment).
• countdownIntervalRef, recordingTimeoutsRef, recordingPromisesRef.
• misuseEventsRef (log event kecurangan: tab hidden, translation, dsb).
• totalTime (durasi ujian, untuk progress bar).
• submitExamRef (menyimpan fungsi submit terbaru).

⸻

4. Alur Lengkap Ujian

4.1. Masuk ke Halaman 1. User membuka URL seperti:
/ ?email=...&id=...&tag=...
Parameter diambil via URLSearchParams saat mount dan disimpan di params. ￼ 2. Browser check:
• Cek userAgent untuk Chrome Desktop, Chrome iOS (CriOS), atau Safari (tanpa Chrome/CriOS).
• Jika bukan salah satu ini → tampilkan UnsupportedBrowserScreen. ￼ 3. Jika browser ok → tampilkan IntroScreen dengan instruksi & checkbox setuju.

4.2. Start Exam & Lock System 1. User klik “Mulai” → handleStartExam:
• Validasi params.email dan params.id.
• Kalau kosong → tampilkan AuthErrorModal & log misuse (auth_error).
• Kalau ada → POST ke /api/check-test-history dengan { email }. 2. check-test-history:
• Build query Kintone: email = "<email>" and title = "JLPT N5 Tes Singkat" limit 1.
• Jika ada record → balikan hasTakenTest = true.
￼ 3. Di frontend:
• Jika hasTakenTest = true → tampilkan toast error + buka LockModal.
• Kalau tidak → boleh mulai tes: beginExamFlow(). ￼ 4. LockModal + handleVerifyCode:
• User isi uniqueCode.
• Submit form → POST ke /api/verify-unique-code { uniqueCode }.
• API query Kintone App lain berdasarkan test_name = "JLPT N5 Tes Singkat" dan ambil unique_code.value.
• Bandingkan dengan input user → balikan { isValid: true/false }.
• Kalau valid → tutup LockModal, jalankan beginExamFlow().

4.3. Begin Exam & Proctoring

beginExamFlow(): 1. Minta izin kamera & mic via getUserMedia({ video: true, audio: true }). 2. Jika sukses:
• Simpan stream.
• generateQuestions():
• Loop CONFIG.groupCounts, ambil beberapa soal dari QUESTION_GROUPS[grp] (shuffle, slice).
• Gabung semua lalu shuffle lagi.
• Untuk masing-masing soal, opsi diacak ulang tapi answerIndex ikut dipindahkan ke posisi yang benar. ￼
• Set qs dan step = "exam".
• Set startTime = Date.now().
• Panggil scheduleRecordings(stream) untuk mulai jadwal rekaman video. ￼ 3. Jika gagal minta media:
• Tampilkan alert bahwa izin kamera & mic diperlukan.
• Log flag media_permission_denied. ￼

useEffect terkait:
• Timer ujian:
• Saat step === "exam", buat interval tiap 1 detik setTimeLeft.
• Saat timeLeft habis → otomatis panggil startSubmitFlow() (auto submit). ￼
• beforeunload:
• Saat step === "exam", pasang handler yang memunculkan konfirmasi jika user mau close tab / reload. ￼
• visibilitychange:
• Jika tab jadi hidden saat step === "exam" → log event tab_hidden dengan timestamp dan waktu relatif. ￼
• MutationObserver:
• Observasi perubahan class di <html>.
• Kalau class mengandung "translated" (indikasi translate oleh browser) dan belum pernah tercatat → log translation_attempt. ￼
• Attach stream ke <video> melalui videoRef.current.srcObject = stream. ￼

4.4. Rekaman Video Segmen

scheduleRecordings(stream):
• Reset semua timeout, promise, segment, chunk.
• Hitung totalSegments = ceil(examDuration / recordInterval).
• Untuk tiap segment i:
• Jadwalkan setTimeout dengan delay i _ recordInterval _ 1000.
• Di dalamnya:
• Buat MediaRecorder baru dengan mimeType = getOptimalMimeType() dan videoBitsPerSecond tertentu.
• Simpan chunk data di chunksRef.current[i] via ondataavailable.
• rec.start().
• setTimeout kedua untuk rec.stop() setelah recordDuration detik.
• Di rec.onstop:
• Jika ada chunk → bungkus ke Blob, upload via uploadSegmentThroughProxy(blob, i).
• uploadSegmentThroughProxy:
• Ambil id (URL param).
• Build FormData dengan video + id.
• POST ke /api/upload-segment.
• API upload-segment:
• Simpan file ke public/videos/tmp sementara.
• Pindahkan ke public/videos/<safeId>/<filename>.
• Return JSON { videoUrl: "/videos/<id>/<filename>" }.

segmentsRef.current[i] diisi dengan URL video atau informasi gagal/kosong.

⸻

5. Submit Ujian & Penyimpanan Hasil

5.1. Trigger Submit

Ada dua cara: 1. User klik tombol Submit dari ExamScreen:
• Mengubah isConfirmSubmitModalOpen jadi true → tampil ConfirmSubmitModal.
• Jika user konfirmasi → handleConfirmSubmit() → startSubmitFlow(). 2. Waktu habis:
• Timer otomatis memanggil startSubmitFlow(). ￼

startSubmitFlow():
• Tutup modal konfirmasi.
• Set isSubmitting = true (muncul SubmittingModal).
• Panggil submitExamRef.current().

5.2. submitExam()

Fungsi di pages/index.js. ￼

Langkah: 1. Hentikan timer dan semua setTimeout rekaman. 2. Kalau MediaRecorder masih aktif, tunggu onstop selesai. 3. await Promise.allSettled(recordingPromisesRef.current.filter(Boolean)) → tunggu semua upload segmen selesai. 4. Stop semua track di stream. 5. Hitung end = Date.now(); set elapsed = end - startTime. 6. Format waktu submit:
• submitTimeDisplay untuk UI (format sv-SE default timezone).
• submitTimeForWebhook (nama webhookString) dengan timezone "Asia/Makassar" untuk dikirim ke backend. 7. Kumpulkan videoUrls dari segmentsRef.current yang string URL. 8. Hitung skor:
• correctCount = jumlah q dimana ans[i] === q.answerIndex.
• computedScore = round(correctCount / total \* 100).
• Simpan ke scoreState. 9. Bentuk responses (placeholder di kode – logic mapping detail jawaban bisa diisi). 10. Payload final:

{
email: params.email,
id: params.id,
tag: params.tag,
score: computedScore,
submitTime: webhookString,
elapsed: detikDurasi,
responses,
flags: misuseEventsRef.current, // log kecurangan
videoUrls, // URL segment video
}

    11.	Kirim ke /api/submitExam via fetch POST JSON.

5.3. API submitExam

File: pages/api/submitExam.js ￼
• Ambil payload dari body: email, id, tag, score, submitTime, elapsed, responses, flags, videoUrls.
• Kirim lagi ke process.env.ZAPIER_WEBHOOK_URL (Zapier) dengan POST JSON.
• Kalau sukses → res.status(200).json({ success: true }).
• Kalau error → log dan kirim 500.

Setelah call selesai, frontend:
• Tutup SubmittingModal dengan animasi kecil.
• Set step = "result" → render ResultScreen dengan finalScore, submitTimeDisplay, elapsed, formatHMS, onRetry.

5.4. Retry

handleRetryExam():
• Reset semua state: step, qs, ans, cur, timeLeft, startTime, elapsed, isAgreed, stream, interval, timeout, recorder, segments, misuse flags.
• Kembali ke state awal seolah baru masuk halaman. ￼

⸻

6. Endpoint Lain: submit-check

File: pages/api/submit-check.js ￼
• Fungsinya sederhana:
• Terima data cek dari client (bebas strukturnya).
• Kalau env ZAPIER_CHECK_WEBHOOK_URL tersedia → POST data ke Zapier.
• Kalau tidak ada, tetap balikan success ke client (tidak mengganggu UX).
• Dipakai untuk laporan pengecekan lain (misal log kecurangan tambahan atau health check sebelum/selama ujian).

⸻

7. Ringkasan Fitur Utama
   1. Ujian JLPT N5 singkat (50 soal, 30 menit) dengan pengacakan soal per kategori.
   2. Autentikasi via URL parameter (email, id, tag).
   3. Lock sekali ikut:
      • Cek riwayat tes di Kintone berdasarkan email + title.
      • Jika sudah pernah, hanya bisa mulai lagi dengan kode unik (juga dari Kintone).
   4. Proctoring:
      • Rekam webcam + audio selama ujian, tersegmentasi dan diupload ke server.
      • Deteksi pindah tab/aplikasi.
      • Deteksi upaya translate halaman.
      • Prevent close/reload dengan beforeunload. ￼
   5. Browser guard: hanya mengizinkan Chrome & Safari. ￼
   6. Integrasi eksternal:
      • Kintone (riwayat & unique code).
      • Zapier (store hasil ujian + flags + video URLs).
      • Endpoint extra untuk kirim “check” ke Zapier.
   7. UX tambahan:
      • Question Map (peta soal) via modal.
      • Confirm Submit modal.
      • Toast notifikasi status proses (cek riwayat, verifikasi kode, error, dll). ￼
