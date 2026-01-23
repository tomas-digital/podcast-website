import { loadAllEpisodes, loadSeason, esc } from "./data.js";

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

function episodeCard(ep) {
  const season = ep.season ? `Season ${ep.season}` : "Season";
  const epNum = (ep.episode ?? ep.episode === 0) ? `EP ${ep.episode}` : "EP";
  const title = esc(ep.title || "Untitled episode");
  const date = esc(ep.date || "");
  const thumb = ep.thumbnail || "https://via.placeholder.com/640x360?text=Episode";
  const hasYT = !!ep.youtube;
  const hasSP = !!ep.spotify;

  return `
    <article class="card">
      <img class="thumb" src="${thumb}" alt="${title}">
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

export async function renderHome() {
  const latestEl = qs("#latest-episode");
  const listEl = qs("#latest-episodes");
  if (!latestEl || !listEl) return;

  const all = await loadAllEpisodes();
  const latest = all[0];

  if (!latest) {
    latestEl.innerHTML = `<p class="small">No episodes yet. (RSS/JSON will populate this later)</p>`;
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

export async function renderEpisodesPage() {
  const listEl = qs("#episodes-list");
  const searchEl = qs("#search");
  if (!listEl) return;

  let activeSeason = "all";
  let all = await loadAllEpisodes();
  let filtered = all;

  function apply() {
    const q = (searchEl?.value || "").toLowerCase().trim();

    // season filter
    if (activeSeason === "1") filtered = all.filter(e => Number(e.season) === 1);
    else if (activeSeason === "2") filtered = all.filter(e => Number(e.season) === 2);
    else filtered = all;

    // search filter
    if (q) {
      filtered = filtered.filter(e =>
        String(e.title || "").toLowerCase().includes(q) ||
        String(e.description || "").toLowerCase().includes(q)
      );
    }

    listEl.innerHTML = filtered.length
      ? `<div class="grid">${filtered.map(episodeCard).join("")}</div>`
      : `<p class="small">No results.</p>`;
  }

  qsa("[data-season]").forEach(btn => {
    btn.addEventListener("click", () => {
      qsa("[data-season]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeSeason = btn.dataset.season;
      apply();
    });
  });

  if (searchEl) searchEl.addEventListener("input", apply);
  apply();
}

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

function extractYouTubeId(url) {
  // supports watch?v=, youtu.be/, /embed/
  const u = String(url);
  let m = u.match(/v=([a-zA-Z0-9_-]{6,})/);
  if (m) return m[1];
  m = u.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (m) return m[1];
  m = u.match(/embed\/([a-zA-Z0-9_-]{6,})/);
  if (m) return m[1];
  return "";
}

function spotifyEmbedUrl(url) {
  // Accept episode or show links and convert to embed
  const u = String(url);
  if (u.includes("/embed/")) return u;
  return u.replace("open.spotify.com/", "open.spotify.com/embed/");
}
