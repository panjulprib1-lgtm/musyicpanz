# MUSYICPANZ Web — starter streaming-style music app

Aplikasi web responsif dengan HTML, CSS, JavaScript, Node.js/Express, Supabase, YouTube Data API dan LRCLIB.

## Yang sudah disiapkan
- UI dark/pink/ungu responsif, sidebar, beranda, pencarian, koleksi, recap, pengaturan.
- Pencarian video musik melalui YouTube Data API (server-side API key).
- Pemutaran melalui YouTube IFrame Player resmi.
- Lirik dari LRCLIB (tidak perlu API key; ketersediaan lirik tergantung katalog).
- Supabase Auth: email/password, Google OAuth, Facebook OAuth (setelah provider diaktifkan).
- Database playlist, favorit, riwayat, profil + Row Level Security.
- Favorit dan riwayat lokal tetap berfungsi dalam mode tamu.

## Mulai lokal
1. Install Node.js 20 atau lebih baru.
2. Ekstrak ZIP, buka folder proyek di terminal.
3. Jalankan `npm install`.
4. Salin `.env.example` menjadi `.env`.
5. Isi URL Supabase, anon key, dan YouTube Data API key pada `.env`.
6. Buka Supabase Dashboard > SQL Editor, jalankan semua isi `supabase/schema.sql`.
7. Di Supabase Authentication > URL Configuration, tambahkan `http://localhost:3000` ke Site URL dan Redirect URLs.
8. Di Supabase Authentication > Providers, aktifkan Email, Google, dan Facebook. Ikuti instruksi Supabase untuk OAuth Client ID/Secret masing-masing provider.
9. Jalankan `npm run dev`.
10. Buka `http://localhost:3000`.

## API key dan keamanan
- Jangan pernah taruh Supabase service-role key atau OAuth client secret di `public/`, HTML, atau JavaScript browser.
- `SUPABASE_ANON_KEY` memang public/publishable dan aman dipakai di browser bila seluruh tabel dilindungi RLS.
- `YOUTUBE_API_KEY` disimpan hanya di `.env` server dan dipakai oleh endpoint Express.
- Jangan mengirim file `.env` ke orang lain atau mengunggahnya ke GitHub.
- Untuk hosting, atur environment variables yang sama di dashboard hosting.

## Batasan layanan yang perlu diketahui
- YouTube IFrame Player memutar konten YouTube sesuai kebijakan YouTube; ini bukan ekstraksi MP3 dan tidak menjanjikan pemutaran background seperti Spotify.
- YouTube Data API hanya untuk pencarian/metadata; kuota dan kebijakan Google berlaku.
- Spotify tidak menyediakan API umum untuk mengambil audio/streaming bebas. Integrasi Spotify playlist atau playback perlu OAuth dan tunduk pada syarat Spotify; playback penuh via Spotify SDK memiliki persyaratan Premium/negara/perangkat.
- LRCLIB adalah penyedia lirik komunitas; tidak semua lagu tersedia dan sinkronisasi lirik bergantung data.
- Login Google/Facebook baru aktif setelah kredensial OAuth dibuat di akun provider dan dikonfigurasi di Supabase. Tidak ada API key rahasia yang bisa dibuat otomatis oleh aplikasi ini.

## Struktur
- `public/index.html` — struktur UI
- `public/style.css` — desain responsif
- `public/app.js` — interaksi, auth, pencarian, player, koleksi
- `server.js` — backend dan proxy API
- `supabase/schema.sql` — skema dan RLS database
- `.env.example` — template konfigurasi rahasia
