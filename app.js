let supabase = null;
let currentUser = null;
let currentTrack = null;
let currentQueue = [];
let queueIndex = -1;
let ytPlayer = null;
let ytReady = false;
let libraryTab = "favorites";
let localHistory = JSON.parse(localStorage.getItem("mp_history") || "[]");
let localFavorites = JSON.parse(localStorage.getItem("mp_favorites") || "[]");

const $ = (id) => document.getElementById(id);
const toast = (message) => {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2600);
};
const esc = (s="") => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fallbackThumb = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs><linearGradient id="g"><stop stop-color="#753b91"/><stop offset="1" stop-color="#ed83b8"/></linearGradient></defs><rect width="100" height="100" rx="12" fill="url(#g)"/><text x="50" y="65" text-anchor="middle" font-size="48" fill="white">♫</text></svg>`);

async function init() {
  try {
    const config = await fetch("/.netlify/functions/config").then(r => r.json());
    if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
      supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      const { data } = await supabase.auth.getSession();
      currentUser = data.session?.user || null;
      supabase.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user || null;
        renderAccount();
        loadLibrary();
      });
    }
  } catch (e) { console.warn("Supabase belum dikonfigurasi", e); }
  renderAccount();
  loadLibrary();
  renderHome();
}
window.onYouTubeIframeAPIReady = () => {
  ytReady = true;
  ytPlayer = new YT.Player("youtubePlayer", {
    height: "1", width: "1", videoId: "",
    playerVars: { playsinline: 1, controls: 0, rel: 0 },
    events: {
      onReady: () => {},
      onStateChange: e => {
        if (e.data === YT.PlayerState.ENDED) playNext();
        if (e.data === YT.PlayerState.PLAYING) $("playButton").textContent = "Ⅱ";
        if (e.data === YT.PlayerState.PAUSED) $("playButton").textContent = "▶";
      }
    }
  });
};
function navigate(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === `page-${page}`));
  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  if (page === "library") loadLibrary();
}
document.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.goto)));
$("globalSearch").addEventListener("keydown", e => { if (e.key === "Enter") { $("searchInput").value = e.target.value; navigate("search"); searchMusic(); } });
$("searchButton").addEventListener("click", searchMusic);
$("searchInput").addEventListener("keydown", e => { if (e.key === "Enter") searchMusic(); });
document.querySelectorAll(".mood-card").forEach(b => b.addEventListener("click", () => {
  $("searchInput").value = b.dataset.mood; navigate("search"); searchMusic();
}));

async function searchMusic() {
  const q = $("searchInput").value.trim();
  if (!q) return toast("Masukkan judul lagu atau artis.");
  $("searchStatus").textContent = "Sedang mencari...";
  $("searchResults").innerHTML = `<div class="empty-state">Mencari lagu “${esc(q)}”...</div>`;
  try {
    const results = await fetch(`/.netlify/functions/youtube-search?q=${encodeURIComponent(q)}`).then(async r => {
      const d = await r.json(); if (!r.ok) throw new Error(d.error); return d;
    });
    $("searchStatus").textContent = `${results.length} hasil dari YouTube`;
    renderTracks($("searchResults"), results);
  } catch (e) {
    $("searchStatus").textContent = "Pencarian gagal";
    $("searchResults").innerHTML = `<div class="empty-state">${esc(e.message)}<br><br>Pastikan YOUTUBE_API_KEY sudah diatur di pengaturan environment Netlify.</div>`;
  }
}
function renderTracks(container, tracks) {
  if (!tracks.length) { container.innerHTML = `<div class="empty-state">Belum ada lagu ditemukan.</div>`; return; }
  container.innerHTML = tracks.map((t,i) => `<article class="track-card" data-index="${i}">
    <img class="track-thumb" src="${esc(t.thumbnail || fallbackThumb)}" onerror="this.src='${fallbackThumb}'">
    <div class="track-info"><b>${esc(t.title)}</b><small>${esc(t.artist || "Unknown artist")}</small></div>
    <button class="track-play" aria-label="Putar">▶</button>
    <button class="heart-button favorite-button" aria-label="Favorit" data-id="${esc(t.id)}">${isFavorite(t.id)?"♥":"♡"}</button>
  </article>`).join("");
  container.querySelectorAll(".track-card").forEach((card,i) => card.addEventListener("click", e => {
    if (e.target.closest(".favorite-button")) return;
    playTracks(tracks, i);
  }));
  container.querySelectorAll(".favorite-button").forEach(btn => btn.addEventListener("click", e => {
    e.stopPropagation(); toggleFavorite(tracks.find(t => t.id === btn.dataset.id));
  }));
}
function renderHome() {
  const saved = localHistory.slice(0,6);
  if (saved.length) renderTracks($("homeTracks"), saved);
  else $("homeTracks").innerHTML = `<div class="empty-state">Gunakan kolom Cari untuk menemukan musik pertamamu.</div>`;
}
function playTracks(tracks, index) {
  if (!ytReady || !ytPlayer) return toast("Player YouTube sedang disiapkan. Coba lagi sebentar.");
  currentQueue = tracks; queueIndex = index; currentTrack = tracks[index];
  const t = currentTrack;
  $("nowTitle").textContent = t.title;
  $("nowArtist").textContent = t.artist || "YouTube";
  $("nowThumb").innerHTML = `<img src="${esc(t.thumbnail || fallbackThumb)}" style="width:100%;height:100%;object-fit:cover;border-radius:9px">`;
  $("likeCurrent").textContent = isFavorite(t.id) ? "♥" : "♡";
  ytPlayer.loadVideoById(t.id);
  localHistory = [t, ...localHistory.filter(x => x.id !== t.id)].slice(0,50);
  localStorage.setItem("mp_history", JSON.stringify(localHistory));
  $("recapCount").textContent = localHistory.length;
  renderHome();
  saveHistory(t);
}
function playNext() {
  if (!currentQueue.length) return;
  queueIndex = (queueIndex + 1) % currentQueue.length;
  playTracks(currentQueue, queueIndex);
}
function playPrev() {
  if (!currentQueue.length) return;
  queueIndex = (queueIndex - 1 + currentQueue.length) % currentQueue.length;
  playTracks(currentQueue, queueIndex);
}
$("playButton").addEventListener("click", () => {
  if (!ytPlayer || !currentTrack) return toast("Pilih lagu terlebih dahulu.");
  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
});
$("nextButton").addEventListener("click", playNext);
$("prevButton").addEventListener("click", playPrev);
$("likeCurrent").addEventListener("click", () => currentTrack && toggleFavorite(currentTrack));
function isFavorite(id) { return localFavorites.some(t => t.id === id); }
async function toggleFavorite(track) {
  if (!track) return;
  if (isFavorite(track.id)) localFavorites = localFavorites.filter(t => t.id !== track.id);
  else localFavorites.unshift(track);
  localStorage.setItem("mp_favorites", JSON.stringify(localFavorites));
  if (supabase && currentUser) {
    const { error } = await supabase.from("favorites").upsert({
      user_id: currentUser.id, video_id: track.id, title: track.title,
      artist: track.artist || "", thumbnail: track.thumbnail || ""
    }, { onConflict: "user_id,video_id" });
    if (error) console.warn(error.message);
    if (isFavorite(track.id)) {
      // Remove is handled separately because an upsert cannot delete.
    } else await supabase.from("favorites").delete().eq("user_id", currentUser.id).eq("video_id", track.id);
  }
  $("likeCurrent").textContent = currentTrack && isFavorite(currentTrack.id) ? "♥" : "♡";
  loadLibrary(); toast(isFavorite(track.id) ? "Ditambahkan ke favorit." : "Dihapus dari favorit.");
}
async function saveHistory(t) {
  if (!supabase || !currentUser) return;
  await supabase.from("listening_history").insert({
    user_id: currentUser.id, video_id: t.id, title: t.title,
    artist: t.artist || "", thumbnail: t.thumbnail || ""
  });
}
async function loadLibrary() {
  let favorites = localFavorites;
  let history = localHistory;
  if (supabase && currentUser) {
    const { data: fav } = await supabase.from("favorites").select("*").order("created_at", {ascending:false});
    const { data: hist } = await supabase.from("listening_history").select("*").order("played_at", {ascending:false}).limit(50);
    if (fav) favorites = fav.map(rowToTrack);
    if (hist) history = hist.map(rowToTrack);
    localFavorites = favorites; localHistory = history;
  }
  $("recapCount").textContent = history.length;
  $("sidebarPlaylists").innerHTML = `<p class="muted small">${currentUser ? "Playlist kamu akan tampil di sini." : "Login untuk menyimpan playlist."}</p>`;
  const data = libraryTab === "favorites" ? favorites : libraryTab === "history" ? history : [];
  if (libraryTab === "playlists") {
    $("libraryContent").innerHTML = `<div class="empty-state">Buat playlist baru menggunakan tombol + di menu kiri (desktop).</div>`;
  } else renderTracks($("libraryContent"), data);
}
function rowToTrack(r) { return { id:r.video_id, title:r.title, artist:r.artist, thumbnail:r.thumbnail, source:"youtube" }; }
document.querySelectorAll("[data-library]").forEach(b => b.addEventListener("click", () => {
  libraryTab = b.dataset.library;
  document.querySelectorAll("[data-library]").forEach(x => x.classList.toggle("active", x === b));
  loadLibrary();
}));
$("newPlaylist").addEventListener("click", async () => {
  if (!currentUser) return openAuth();
  const name = prompt("Nama playlist:");
  if (!name) return;
  const { error } = await supabase.from("playlists").insert({ user_id:currentUser.id, name });
  if (error) return toast(error.message);
  toast("Playlist dibuat."); loadPlaylists();
});
async function loadPlaylists() {
  if (!supabase || !currentUser) return;
  const { data } = await supabase.from("playlists").select("*").order("created_at");
  $("sidebarPlaylists").innerHTML = (data || []).map(p => `<button>♫ ${esc(p.name)}</button>`).join("") || `<p class="muted small">Belum ada playlist.</p>`;
}
function openAuth() { $("authModal").classList.remove("hidden"); }
function closeAuth() { $("authModal").classList.add("hidden"); }
$("authOpen").addEventListener("click", openAuth);
$("topLogin").addEventListener("click", openAuth);
$("profileAuth").addEventListener("click", openAuth);
$("authClose").addEventListener("click", closeAuth);
$("emailLogin").addEventListener("click", async () => {
  if (!supabase) return $("authMessage").textContent = "Supabase belum dikonfigurasi di file .env.";
  const { error } = await supabase.auth.signInWithPassword({ email:$("authEmail").value, password:$("authPassword").value });
  $("authMessage").textContent = error?.message || "Login berhasil.";
});
$("emailSignup").addEventListener("click", async () => {
  if (!supabase) return $("authMessage").textContent = "Supabase belum dikonfigurasi di file .env.";
  const { error } = await supabase.auth.signUp({ email:$("authEmail").value, password:$("authPassword").value });
  $("authMessage").textContent = error?.message || "Cek email untuk verifikasi akun.";
});
async function oauth(provider) {
  if (!supabase) return $("authMessage").textContent = "Supabase belum dikonfigurasi di file .env.";
  const { error } = await supabase.auth.signInWithOAuth({ provider, options:{ redirectTo:location.origin } });
  if (error) $("authMessage").textContent = error.message;
}
$("googleLogin").addEventListener("click", () => oauth("google"));
$("facebookLogin").addEventListener("click", () => oauth("facebook"));
function renderAccount() {
  const name = currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Pengunjung";
  $("sideUser").textContent = name; $("sidePlan").textContent = currentUser ? "Akun terhubung" : "Mode tamu";
  $("profileName").textContent = name; $("profileEmail").textContent = currentUser?.email || "Belum login";
  $("topLogin").classList.toggle("hidden", !!currentUser);
  $("userButton").classList.toggle("hidden", !currentUser);
  $("userButton").textContent = name[0]?.toUpperCase() || "P";
  $("authOpen").textContent = currentUser ? "Keluar" : "Login";
  $("authOpen").onclick = async () => {
    if (currentUser) { await supabase.auth.signOut(); toast("Kamu sudah logout."); }
    else openAuth();
  };
  $("profileAuth").textContent = currentUser ? "Keluar" : "Login";
  $("profileAuth").onclick = async () => currentUser ? supabase.auth.signOut() : openAuth();
  if (currentUser) loadPlaylists();
}
$("lyricsButton").addEventListener("click", async () => {
  if (!currentTrack) return toast("Pilih lagu terlebih dahulu.");
  $("lyricsModal").classList.remove("hidden");
  $("lyricsTitle").textContent = currentTrack.title;
  $("lyricsText").textContent = "Mencari lirik...";
  try {
    const d = await fetch(`/.netlify/functions/lyrics?track=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist || "")}`).then(r => r.json());
    $("lyricsText").textContent = d.syncedLyrics || d.plainLyrics || d.error || "Lirik belum tersedia.";
  } catch { $("lyricsText").textContent = "Lirik gagal dimuat."; }
});
$("lyricsClose").addEventListener("click", () => $("lyricsModal").classList.add("hidden"));
$("queueButton").addEventListener("click", () => toast(`${currentQueue.length} lagu dalam antrean.`));
init();
