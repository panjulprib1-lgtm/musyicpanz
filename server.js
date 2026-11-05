import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

app.get("/api/config", (_req, res) => {
  // Only public browser-safe values are sent to the client.
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
  });
});

app.get("/api/youtube/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Masukkan kata pencarian." });
  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(503).json({ error: "YouTube API belum dikonfigurasi. Isi YOUTUBE_API_KEY di .env." });
  }
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.search = new URLSearchParams({
      part: "snippet", type: "video", videoCategoryId: "10",
      maxResults: "12", q: `${q} official audio`, key: process.env.YOUTUBE_API_KEY
    });
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "YouTube API error." });
    res.json((data.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || "",
      source: "youtube"
    })));
  } catch {
    res.status(500).json({ error: "Gagal menghubungi YouTube." });
  }
});

app.get("/api/lyrics", async (req, res) => {
  const track = String(req.query.track || "").trim();
  const artist = String(req.query.artist || "").trim();
  if (!track) return res.status(400).json({ error: "Judul lagu wajib diisi." });
  try {
    const url = new URL("https://lrclib.net/api/get");
    url.search = new URLSearchParams({ track_name: track, artist_name: artist });
    const response = await fetch(url, { headers: { "User-Agent": "Musyicpanz/1.0 (music web app)" } });
    if (response.status === 404) return res.json({ syncedLyrics: "", plainLyrics: "Lirik belum tersedia." });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: "Penyedia lirik tidak tersedia." });
    res.json({ syncedLyrics: data.syncedLyrics || "", plainLyrics: data.plainLyrics || "" });
  } catch {
    res.status(500).json({ error: "Gagal mengambil lirik." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`MUSYICPANZ berjalan di http://localhost:${PORT}`));
