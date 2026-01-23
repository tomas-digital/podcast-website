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
  const listEl = document.getElementById("episodes-list");
  const pagEl = document.getElementById("pagination");
  const searchEl = document.getElementById("search");
  const chips = Array.from(document.querySelectorAll(".chip"));

  if (!listEl) return;

  // State
  const state = {
    all: [],
    filtered: [],
    season: "all",   // "all" | "1" | "2"
    q: "",
    page: 1,
    perPage: 12
  };

  // Helpers
  const norm = (s) => (s || "").toString().toLowerCase().trim();

  const applyFilters = () => {
    let items = [...state.all];

    if (state.season !== "all") {
      const seasonNum = Number(state.season);
      items = items.filter(e => Number(e.season) === seasonNum);
    }

    if (state.q) {
      const q = norm(state.q);
      items = items.filter(e => {
        const hay = [
          e.title,
          e.description,
          `s${e.season}e${e.episode}`,
          e.date
        ].map(norm).join(" ");
        return hay.includes(q);
      });
    }

    state.filtered = items;

    // Clamp page
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
  };

  const youtubeIdFromUrl = (url) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      // fallback
      const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|$)/);
      return m ? m[1] : null;
    } catch {
      const m = (url || "").match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|$)/);
      return m ? m[1] : null;
    }
  };

  const renderCards = (items) => {
    if (!items.length) {
      listEl.innerHTML = `<p class="small">Нема резултати.</p>`;
      return;
    }

    // Grid wrapper like your design
    listEl.innerHTML = `
      <div class="grid">
        ${items.map(ep => {
          const ytId = youtubeIdFromUrl(ep.youtube);
          const thumb = ep.thumbnail || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "");
          const date = ep.date || "";
          const season = ep.season ?? "";
          const episode = ep.episode ?? "";
          const title = ep.title || "Untitled episode";

          return `
            <article class="card">
              <a href="episode.html?id=${encodeURIComponent(ep.id)}" style="text-decoration:none;color:inherit;">
                <div class="thumb" style="background:#0b0d10;">
                  ${thumb ? `<img src="${thumb}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">` : ""}
                </div>

                <div class="card-body">
                  <div class="meta" style="margin-bottom:10px;">
                    <span class="badge">Season ${season}</span>
                    <span class="badge">EP ${episode}</span>
                    ${date ? `<span class="badge">${date}</span>` : ""}
                  </div>

                  <h3 class="card-title">${title}</h3>
                  <p class="small">${(ep.description || "").slice(0, 120)}${(ep.description || "").length > 120 ? "…" : ""}</p>

                  <div class="actions" style="margin-top:12px;">
                    <a class="btn primary" href="episode.html?id=${encodeURIComponent(ep.id)}">Open</a>
                    ${ep.youtube ? `<a class="btn ghost" href="${ep.youtube}" target="_blank" rel="noopener">Watch</a>` : ""}
                  </div>
                </div>
              </a>
            </article>
          `;
        }).join("")}
      </div>
    `;
  };

  const renderPagination = () => {
    if (!pagEl) return;

    const total = state.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.perPage));
    const start = (state.page - 1) * state.perPage + 1;
    const end = Math.min(total, state.page * state.perPage);

    // Hide pagination if not needed
    if (totalPages <= 1) {
      pagEl.innerHTML = total ? `<div class="page-info small">Прикажани ${start}-${end} од ${total}</div>` : "";
      return;
    }

    // Build page number buttons (compact)
    const pages = [];
    const push = (p) => pages.push(p);

    push(1);
    if (state.page - 2 > 2) push("…");
    for (let p = Math.max(2, state.page - 2); p <= Math.min(totalPages - 1, state.page + 2); p++) push(p);
    if (state.page + 2 < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    pagEl.innerHTML = `
      <div class="pagination">
        <div class="page-info small">Прикажани ${start}-${end} од ${total}</div>

        <div class="page-actions">
          <button class="btn ghost" data-page="prev" ${state.page === 1 ? "disabled" : ""}>Prev</button>

          ${pages.map(p => {
            if (p === "…") return `<span class="small" style="opacity:.6;padding:0 6px;">…</span>`;
            const active = p === state.page ? "primary" : "ghost";
            return `<button class="btn ${active}" data-page="${p}">${p}</button>`;
          }).join("")}

          <button class="btn ghost" data-page="next" ${state.page === totalPages ? "disabled" : ""}>Next</button>
        </div>
      </div>
    `;

    // Wire clicks
    pagEl.querySelectorAll("[data-page]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = btn.getAttribute("data-page");
        const totalPages2 = Math.max(1, Math.ceil(state.filtered.length / state.perPage));

        if (v === "prev") state.page = Math.max(1, state.page - 1);
        else if (v === "next") state.page = Math.min(totalPages2, state.page + 1);
        else state.page = Number(v);

        paint();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  };

  const paint = () => {
    applyFilters();
    const startIdx = (state.page - 1) * state.perPage;
    const pageItems = state.filtered.slice(startIdx, startIdx + state.perPage);
    renderCards(pageItems);
    renderPagination();
  };

  // Load data
  listEl.innerHTML = `<p class="small">Loading episodes…</p>`;
  state.all = await loadAllEpisodes();
  // Ensure newest first (if dates exist)
  state.all.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  paint();

  // Events
  if (searchEl) {
    searchEl.addEventListener("input", (e) => {
      state.q = e.target.value || "";
      state.page = 1;
      paint();
    });
  }

  chips.forEach(ch => {
    ch.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      ch.classList.add("active");
      state.season = ch.getAttribute("data-season") || "all";
      state.page = 1;
      paint();
    });
  });
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
