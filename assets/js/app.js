// assets/js/app.js
import { loadAllEpisodes, loadShorts, esc } from "./data.js";

function qs(sel) { return document.querySelector(sel); }

function extractYouTubeId(url) {
  const u = String(url || "");
  let m = u.match(/v=([a-zA-Z0-9_-]{6,})/);
  if (m) return m[1];
  m = u.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (m) return m[1];
  m = u.match(/embed\/([a-zA-Z0-9_-]{6,})/);
  if (m) return m[1];
  return "";
}

function spotifyEmbedUrl(url) {
  const u = String(url || "");
  if (!u) return "";
  if (u.includes("/embed/")) return u;
  return u.replace("open.spotify.com/", "open.spotify.com/embed/");
}

function youtubeIdFromUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|$)/);
    return m ? m[1] : "";
  } catch {
    const m = (url || "").match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|$)/);
    return m ? m[1] : "";
  }
}

function episodeCard(ep) {
  const season = ep.season ? `Season ${ep.season}` : "Season";
  const epNum = (ep.episode ?? ep.episode === 0) ? `EP ${ep.episode}` : "EP";
  const title = esc(ep.title || "Untitled episode");
  const date = esc(ep.date || "");
  const thumb = ep.thumbnail || (ep.youtube ? `https://img.youtube.com/vi/${youtubeIdFromUrl(ep.youtube)}/hqdefault.jpg` : "");
  const hasYT = !!ep.youtube;
  const hasSP = !!ep.spotify;

  return `
    <article class="card">
      <div class="thumb" style="background:#0b0d10;">
        ${thumb ? `<img src="${esc(thumb)}" alt="${title}" style="width:100%;height:100%;object-fit:cover;display:block;">` : ""}
      </div>

      <div class="card-body">
        <h3 class="card-title">${title}</h3>
        <div class="meta">
          <span class="badge">${season}</span>
          <span class="badge">${epNum}</span>
          ${date ? `<span class="badge">${date}</span>` : ""}
        </div>

        <div class="actions">
          <a class="btn primary" href="episode.html?id=${encodeURIComponent(ep.id)}">Open</a>
          ${hasYT ? `<a class="btn green" href="${esc(ep.youtube)}" target="_blank" rel="noopener">Watch</a>` : ""}
          ${hasSP ? `<a class="btn" href="${esc(ep.spotify)}" target="_blank" rel="noopener">Listen</a>` : ""}
        </div>
      </div>
    </article>
  `;
}

/* =========================
   HOME
========================= */
export async function renderHome() {
  const latestEl = qs("#latest-episode");
  const listEl = qs("#latest-episodes");
  if (!latestEl || !listEl) return;

  const all = await loadAllEpisodes();
  const latest = all[0];

  if (!latest) {
    latestEl.innerHTML = `<p class="small">No episodes yet.</p>`;
    listEl.innerHTML = "";
    return;
  }

  latestEl.innerHTML = `
    <div class="card">
      ${latest.youtube ? `
        <div class="embed">
          <iframe
            src="https://www.youtube.com/embed/${extractYouTubeId(latest.youtube)}"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>
      ` : `
        <div class="card-body">
          <p class="small">Video not available for this episode yet.</p>
        </div>
      `}
      <div class="card-body">
        <h3 class="card-title">${esc(latest.title)}</h3>
        <div class="meta">
          <span class="badge">Season ${latest.season ?? "-"}</span>
          <span class="badge">${latest.episode != null ? `EP ${latest.episode}` : "EP -"}</span>
          ${latest.date ? `<span class="badge">${esc(latest.date)}</span>` : ""}
        </div>
        <div class="actions">
          <a class="btn primary" href="episode.html?id=${encodeURIComponent(latest.id)}">Open episode page</a>
          ${latest.spotify ? `<a class="btn" href="${esc(latest.spotify)}" target="_blank" rel="noopener">Listen on Spotify</a>` : ""}
          ${latest.youtube ? `<a class="btn green" href="${esc(latest.youtube)}" target="_blank" rel="noopener">Watch on YouTube</a>` : ""}
        </div>
      </div>
    </div>
  `;

  const last6 = all.slice(0, 6);
  listEl.innerHTML = `<div class="grid">${last6.map(episodeCard).join("")}</div>`;
}

/* =========================
   EPISODES PAGE (9 latest + See more)
========================= */
export async function renderEpisodesPage() {
  const listEl = document.getElementById("episodes-list");
  const searchEl = document.getElementById("search");
  const chips = Array.from(document.querySelectorAll(".chip"));
  const loadMoreBtn = document.getElementById("load-more");
  const loadMoreWrap = document.getElementById("load-more-wrap");

  if (!listEl) return;

  const state = {
    all: [],
    filtered: [],
    season: "all",
    q: "",
    showAll: false,
    initialCount: 9,
  };

  const norm = (s) => (s || "").toString().toLowerCase().trim();

  const applyFilters = () => {
    let items = [...state.all];

    if (state.season !== "all") {
      const s = Number(state.season);
      items = items.filter(e => Number(e.season) === s);
    }

    if (state.q) {
      const q = norm(state.q);
      items = items.filter(e => {
        const hay = [e.title, e.description, e.date, `s${e.season}e${e.episode}`].map(norm).join(" ");
        return hay.includes(q);
      });
    }

    state.filtered = items;
  };

  const renderCards = (items) => {
    if (!items.length) {
      listEl.innerHTML = `<p class="small">Нема резултати.</p>`;
      return;
    }
    listEl.innerHTML = `<div class="grid">${items.map(episodeCard).join("")}</div>`;
  };

  const paint = () => {
    applyFilters();
    const total = state.filtered.length;
    const shouldLimit = !state.showAll && !state.q;

    const visible = shouldLimit ? state.filtered.slice(0, state.initialCount) : state.filtered;
    renderCards(visible);

    if (loadMoreWrap) {
      const needBtn = shouldLimit && total > state.initialCount;
      loadMoreWrap.style.display = needBtn ? "flex" : "none";
    }
  };

  listEl.innerHTML = `<p class="small">Loading episodes…</p>`;
  state.all = await loadAllEpisodes();
  paint();

  searchEl?.addEventListener("input", (e) => {
    state.q = e.target.value || "";
    paint();
  });

  chips.forEach(ch => {
    ch.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      ch.classList.add("active");

      state.season = ch.getAttribute("data-season") || "all";
      state.showAll = false;
      paint();
    });
  });

  loadMoreBtn?.addEventListener("click", () => {
    state.showAll = true;
    paint();
  });
}

/* =========================
   EPISODE DETAIL
========================= */
export async function renderEpisodeDetail() {
  const detailEl = qs("#episode-detail");
  if (!detailEl) return;

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) {
    detailEl.innerHTML = `<p class="small">Missing episode id.</p>`;
    return;
  }

  const all = await loadAllEpisodes();
  const ep = all.find(e => String(e.id) === String(id));

  if (!ep) {
    detailEl.innerHTML = `<p class="small">Episode not found.</p>`;
    return;
  }

  detailEl.innerHTML = `
    <div class="hero">
      <h1>${esc(ep.title)}</h1>
      <p class="small">Season ${ep.season ?? "-"} · ${ep.episode != null ? `EP ${ep.episode}` : "EP -"} ${ep.date ? `· ${esc(ep.date)}` : ""}</p>
    </div>

    <div style="height:16px"></div>

    ${ep.youtube ? `
      <div class="embed">
        <iframe
          src="https://www.youtube.com/embed/${extractYouTubeId(ep.youtube)}"
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>
      <div style="height:16px"></div>
    ` : ""}

    ${ep.spotify ? `
      <div class="embed">
        <iframe
          src="${spotifyEmbedUrl(ep.spotify)}"
          title="Spotify player"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"></iframe>
      </div>
      <div style="height:16px"></div>
    ` : ""}

    <div class="card">
      <div class="card-body">
        <h2 class="section-title" style="margin-top:0">Show notes</h2>
        <p class="small">${esc(ep.description || "No description yet.")}</p>

        <div class="actions">
          ${ep.youtube ? `<a class="btn green" href="${esc(ep.youtube)}" target="_blank" rel="noopener">Watch on YouTube</a>` : ""}
          ${ep.spotify ? `<a class="btn" href="${esc(ep.spotify)}" target="_blank" rel="noopener">Listen on Spotify</a>` : ""}
          <a class="btn primary" href="episodes.html">Back to Episodes</a>
        </div>
      </div>
    </div>
  `;
}

/* =========================
   SHORTS (HOME) - 6 + "See more"
========================= */
let shortsVisible = 6;
let allShorts = [];

function renderShorts(){
  const row = document.querySelector(".shorts-row");
  const btn = document.getElementById("shorts-more");
  if (!row) return;

  const shown = allShorts.slice(0, shortsVisible);

  row.innerHTML = shown.map(s => `
    <a class="short-card" href="${esc(s.url || "#")}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;">
      <div class="short-thumb">
        <img src="${esc(s.thumbnail || "")}" alt="">
      </div>
      <div class="label">${esc(s.title || "")}</div>
    </a>
  `).join("");

  if (btn){
    btn.style.display = shortsVisible < allShorts.length ? "inline-flex" : "none";
  }
}

async function initShorts(){
  const row = document.querySelector(".shorts-row");
  if (!row) return; // only on pages with shorts section

  try{
    allShorts = await loadShorts();
  }catch(e){
    console.warn("Shorts failed to load:", e);
    allShorts = [];
  }

  if (!Array.isArray(allShorts) || allShorts.length === 0){
    return;
  }

  // newest first (if date exists)
  allShorts.sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")));

  renderShorts();

  const btn = document.getElementById("shorts-more");
  btn?.addEventListener("click", (e) => {
    e.preventDefault();
    shortsVisible += 6;
    renderShorts();
  });
}

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* =========================
   ROUTER / INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // run based on what's on the page
  if (qs("#latest-episode") && qs("#latest-episodes")) renderHome();
  if (qs("#episodes-list")) renderEpisodesPage();
  if (qs("#episode-detail")) renderEpisodeDetail();

  // safe on all pages
  initShorts();
});
