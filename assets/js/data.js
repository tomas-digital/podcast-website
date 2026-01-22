// data.js — Data layer (RSS-ready)
//
// Today: reads local JSON files (data/season1.json, data/season2.json)
// Future: GitHub Action / Cron will generate those JSON files from RSS.
// TODO: replace JSON with RSS-generated JSON (same output format), no UI refactor needed.

export async function loadSeason(seasonNumber) {
  const res = await fetch(`data/season${seasonNumber}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load season${seasonNumber}.json`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function loadAllEpisodes() {
  const [s1, s2] = await Promise.all([loadSeason(1), loadSeason(2)]);
  const all = [...s1, ...s2];

  // Sort newest first (by date string YYYY-MM-DD)
  all.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return all;
}

// Helper: safe text
export function esc(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
