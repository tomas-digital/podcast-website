/* 
================================================================================
APP LAYER - Rendering & Interaction Logic
================================================================================
This file handles all UI rendering and user interactions.
It uses the data.js layer to fetch episode data.
================================================================================
*/

// Determine which page we're on based on current URL
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

// Initialize the appropriate page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (currentPage === 'index.html' || currentPage === '') {
    initHomePage();
  } else if (currentPage === 'episodes.html') {
    initEpisodesPage();
  } else if (currentPage === 'episode.html') {
    initEpisodeDetailPage();
  }
});

/* 
================================================================================
HOME PAGE - Latest Episode + Latest 6 Episodes
================================================================================
*/
async function initHomePage() {
  const episodes = await loadAllEpisodes();
  
  if (episodes.length === 0) {
    renderEmptyState();
    return;
  }
  
  // Render latest episode (first in sorted array)
  renderLatestEpisode(episodes[0]);
  
  // Render latest 6 episodes
  renderLatestSixEpisodes(episodes.slice(0, 6));
}

/**
 * Render the featured latest episode
 */
function renderLatestEpisode(episode) {
  const container = document.getElementById('latest-episode');
  if (!container) return;
  
  const thumbnail = episode.thumbnail || `https://img.youtube.com/vi/${getYouTubeId(episode.youtube)}/hqdefault.jpg`;
  
  container.innerHTML = `
    <img src="${thumbnail}" alt="${episode.title}" class="latest-episode-thumbnail" 
         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22%3E%3Crect width=%22800%22 height=%22450%22 fill=%22%232a2a2a%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22%236b6b6b%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Thumbnail%3C/text%3E%3C/svg%3E'">
    <div class="latest-episode-content">
      <div class="episode-card-header">
        <span class="season-badge">Сезона ${episode.season} • EP ${episode.episode}</span>
        <span class="episode-date">${formatDate(episode.date)}</span>
      </div>
      <h3 class="latest-episode-title">${episode.title}</h3>
      <p class="latest-episode-description">${episode.description || 'Нема опис.'}</p>
      <a href="episode.html?id=${episode.id}" class="btn">Слушај сега →</a>
    </div>
  `;
}

/**
 * Render latest 6 episodes grid
 */
function renderLatestSixEpisodes(episodes) {
  const container = document.getElementById('latest-episodes');
  if (!container) return;
  
  if (episodes.length === 0) {
    container.innerHTML = '<p class="loading">Нема достапни епизоди.</p>';
    return;
  }
  
  container.innerHTML = episodes.map(ep => createEpisodeCard(ep)).join('');
}

/**
 * Render empty state when no episodes exist
 */
function renderEmptyState() {
  const latestContainer = document.getElementById('latest-episode');
  const gridContainer = document.getElementById('latest-episodes');
  
  const emptyMessage = `
    <div class="no-results">
      <p>Сè уште нема објавени епизоди. Следете не за ажурирања!</p>
    </div>
  `;
  
  if (latestContainer) latestContainer.innerHTML = emptyMessage;
  if (gridContainer) gridContainer.innerHTML = '';
}

/* 
================================================================================
EPISODES PAGE - List with Search & Filters
================================================================================
*/
let allEpisodesData = [];
let currentFilter = 'all';
let currentSearchQuery = '';

async function initEpisodesPage() {
  // Load all episodes
  allEpisodesData = await loadAllEpisodes();
  
  // Initial render
  renderEpisodesList(allEpisodesData);
  
  // Setup search functionality
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // Setup filter tabs
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', handleFilterClick);
  });
}

/**
 * Handle search input
 */
function handleSearch(e) {
  currentSearchQuery = e.target.value;
  applyFiltersAndSearch();
}

/**
 * Handle filter tab click
 */
function handleFilterClick(e) {
  const season = e.target.dataset.season;
  currentFilter = season;
  
  // Update active tab
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  e.target.classList.add('active');
  
  applyFiltersAndSearch();
}

/**
 * Apply both filters and search
 */
function applyFiltersAndSearch() {
  let filtered = allEpisodesData;
  
  // Apply season filter
  filtered = filterBySeason(filtered, currentFilter);
  
  // Apply search
  filtered = searchEpisodes(filtered, currentSearchQuery);
  
  // Render results
  renderEpisodesList(filtered);
}

/**
 * Render episodes list
 */
function renderEpisodesList(episodes) {
  const container = document.getElementById('episodes-list');
  const noResults = document.getElementById('no-results');
  
  if (!container) return;
  
  if (episodes.length === 0) {
    container.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
    return;
  }
  
  if (noResults) noResults.style.display = 'none';
  container.innerHTML = episodes.map(ep => createEpisodeCard(ep)).join('');
}

/* 
================================================================================
EPISODE DETAIL PAGE - Single Episode View
================================================================================
*/
async function initEpisodeDetailPage() {
  // Get episode ID from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const episodeId = urlParams.get('id');
  
  if (!episodeId) {
    showEpisodeError();
    return;
  }
  
  // Load episode data
  const episode = await getEpisodeById(episodeId);
  
  if (!episode) {
    showEpisodeError();
    return;
  }
  
  // Render episode detail
  renderEpisodeDetail(episode);
}

/**
 * Render full episode detail page
 */
function renderEpisodeDetail(episode) {
  const container = document.getElementById('episode-detail');
  if (!container) return;
  
  // Update page title
  document.title = `${episode.title} - Мој Подкаст`;
  
  // Build embed sections
  let embedsHTML = '';
  
  // YouTube embed
  if (episode.youtube) {
    const youtubeId = getYouTubeId(episode.youtube);
    if (youtubeId) {
      embedsHTML += `
        <div class="embed-container">
          <iframe 
            src="https://www.youtube.com/embed/${youtubeId}" 
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          ></iframe>
        </div>
      `;
    }
  }
  
  // Spotify embed
  if (episode.spotify) {
    const spotifyId = getSpotifyId(episode.spotify);
    if (spotifyId) {
      embedsHTML += `
        <div class="embed-container">
          <iframe 
            src="https://open.spotify.com/embed/episode/${spotifyId}" 
            allowfullscreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          ></iframe>
        </div>
      `;
    }
  }
  
  container.innerHTML = `
    <div class="episode-detail-header">
      <div class="episode-detail-meta">
        <span class="season-badge">Сезона ${episode.season} • EP ${episode.episode}</span>
        <span class="episode-date">${formatDate(episode.date)}</span>
      </div>
      <h1 class="episode-detail-title">${episode.title}</h1>
    </div>
    
    ${embedsHTML}
    
    <div class="episode-detail-description">
      <h3>За епизодата</h3>
      <p>${episode.description || 'Нема опис за оваа епизода.'}</p>
    </div>
  `;
}

/**
 * Show error when episode is not found
 */
function showEpisodeError() {
  const container = document.getElementById('episode-detail');
  const errorDiv = document.getElementById('episode-error');
  
  if (container) container.style.display = 'none';
  if (errorDiv) errorDiv.style.display = 'block';
}

/* 
================================================================================
REUSABLE COMPONENTS
================================================================================
*/

/**
 * Create episode card HTML (used in grids)
 */
function createEpisodeCard(episode) {
  const thumbnail = episode.thumbnail || `https://img.youtube.com/vi/${getYouTubeId(episode.youtube)}/hqdefault.jpg`;
  
  return `
    <a href="episode.html?id=${episode.id}" class="episode-card">
      <img 
        src="${thumbnail}" 
        alt="${episode.title}" 
        class="episode-card-thumbnail"
        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22450%22%3E%3Crect width=%22800%22 height=%22450%22 fill=%22%232a2a2a%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22%236b6b6b%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Thumbnail%3C/text%3E%3C/svg%3E'"
      >
      <div class="episode-card-content">
        <div class="episode-card-header">
          <span class="season-badge">S${episode.season}E${episode.episode}</span>
          <span class="episode-date">${formatDate(episode.date)}</span>
        </div>
        <h3 class="episode-card-title">${episode.title}</h3>
        <p class="episode-card-description">${episode.description || 'Нема опис.'}</p>
      </div>
    </a>
  `;
}
