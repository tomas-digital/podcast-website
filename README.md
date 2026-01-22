# 🎙️ Podcast Website

Статична podcast website направена со чист HTML, CSS и JavaScript. Dark theme, mobile-first дизајн, подготвена за RSS интеграција.

## 📁 Структура на файлови

```
podcast-website/
├── index.html              # Home page (Latest + Latest 6)
├── episodes.html           # All Episodes со search и filters
├── episode.html            # Single episode detail
├── README.md               # Овој файл
├── assets/
│   ├── css/
│   │   └── style.css       # Dark theme стилови
│   └── js/
│       ├── app.js          # UI rendering логика
│       └── data.js         # Data layer (RSS-ready)
└── data/
    ├── season1.json        # Season 1 episodes
    └── season2.json        # Season 2 episodes
```

## 🚀 Како да го пуштиш локално

### Опција 1: Директно во browser
1. Отвори `index.html` со double-click
2. Ќе работи, но нема да може да вчита JSON files (CORS restriction)

### Опција 2: Локален server (препорачано)

**Python:**
```bash
# Python 3
python -m http.server 8000

# Отвори: http://localhost:8000
```

**Node.js (ако имаш npx):**
```bash
npx serve

# Или инсталирај http-server глобално
npm install -g http-server
http-server
```

**VS Code:**
- Инсталирај "Live Server" extension
- Right-click на `index.html` → "Open with Live Server"

## ✏️ Како да додаваш епизоди

### Ручно (за testing)

Отвори `data/season1.json` или `data/season2.json` и додај епизоди во следниот формат:

```json
[
  {
    "id": "s1e1",
    "season": 1,
    "episode": 1,
    "title": "EP 1 – Име на гостин – Тема",
    "date": "2026-01-15",
    "youtube": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "spotify": "https://open.spotify.com/episode/XXXXXX",
    "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "description": "Кратки белешки за епизодата. Што ќе дискутирате, кој е гостинот, итн."
  },
  {
    "id": "s1e2",
    "season": 1,
    "episode": 2,
    "title": "EP 2 – Друг гостин – Друга тема",
    "date": "2026-01-22",
    "youtube": "https://www.youtube.com/watch?v=XXXXX",
    "spotify": "https://open.spotify.com/episode/YYYYY",
    "thumbnail": "https://img.youtube.com/vi/XXXXX/hqdefault.jpg",
    "description": "Опис на втората епизода..."
  }
]
```

### Полиња (сите опционални освен id, season, episode, title, date):

- **id** *(задолжително)*: Unique ID (формат: `s1e1`, `s2e12`, итн.)
- **season** *(задолжително)*: Број на сезона (1, 2, 3...)
- **episode** *(задолжително)*: Број на епизода (1, 2, 3...)
- **title** *(задолжително)*: Наслов на епизода
- **date** *(задолжително)*: Датум (формат: `YYYY-MM-DD`)
- **youtube** *(опционално)*: YouTube URL
- **spotify** *(опционално)*: Spotify episode URL
- **thumbnail** *(опционално)*: URL на thumbnail слика (ако нема, автоматски ќе се земе од YouTube)
- **description** *(опционално)*: Show notes / опис

## 🎨 Како да го прилагодиш дизајнот

Отвори `assets/css/style.css` и промени ги CSS Variables на врвот:

```css
:root {
  /* Промени ги боите тука */
  --color-primary: #8b5cf6;       /* Твојата primary боја */
  --color-bg-dark: #0a0a0a;       /* Background */
  --color-bg-medium: #1a1a1a;     /* Cards */
  --color-text-primary: #ffffff;  /* Text */
  
  /* ... и останатите */
}
```

### Лесни едитови:

1. **Podcast име:** Промени го во `index.html`, `episodes.html`, `episode.html` каде пишува `🎙️ Мој Подкаст`
2. **Hero текст:** Промени го во `index.html` под `<section class="hero">`
3. **Footer links:** Додај ги твоите social links во `<div class="social-links">`
4. **Боја акцент:** Промени `--color-primary` во `style.css`

## 🔮 RSS Интеграција (подоцна)

Тековно, епизодите се read-ваат од статични JSON файлови. Подоцна, овие JSON файлови ќе се генерираат автоматски од твојот RSS feed.

### Plan за RSS интеграција:

1. **Креирај GitHub Action** (`.github/workflows/update-episodes.yml`)
2. **Fetch RSS feed** од твојата podcast платформа (Spotify, YouTube, custom feed)
3. **Parse RSS** и convert во `data/season1.json` и `data/season2.json`
4. **Auto-commit** промените назад во repo
5. **Schedule** да се извршува на секои 6 часа или кога додаваш нова епизода

### Example GitHub Action workflow:

```yaml
name: Update Episodes from RSS

on:
  schedule:
    - cron: '0 */6 * * *'  # Секои 6 часа
  workflow_dispatch:         # Manual trigger

jobs:
  update-episodes:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install rss-parser
      
      - name: Generate JSON from RSS
        run: node scripts/generate-json-from-rss.js
        env:
          RSS_FEED_URL: ${{ secrets.RSS_FEED_URL }}
      
      - name: Commit changes
        uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: "🤖 Auto-update episodes from RSS"
          file_pattern: "data/*.json"
```

### Script пример (`scripts/generate-json-from-rss.js`):

```javascript
const Parser = require('rss-parser');
const fs = require('fs');

const parser = new Parser();

async function generateJSON() {
  const feed = await parser.parseURL(process.env.RSS_FEED_URL);
  
  const episodes = feed.items.map((item, index) => ({
    id: `s1e${index + 1}`,
    season: 1,
    episode: index + 1,
    title: item.title,
    date: new Date(item.pubDate).toISOString().split('T')[0],
    youtube: item.link,
    spotify: item.enclosure?.url,
    thumbnail: item.itunes?.image || item.enclosure?.url,
    description: item.contentSnippet || item.content
  }));
  
  fs.writeFileSync('data/season1.json', JSON.stringify(episodes, null, 2));
  console.log('✅ Generated season1.json');
}

generateJSON();
```

**Важно:** Ќе треба да го прилагодиш parsing logic според твојот RSS format.

## 🛠️ Tech Stack

- **HTML5** - Семантички markup
- **CSS3** - Custom properties, Grid, Flexbox
- **Vanilla JavaScript** - Без frameworks
- **JSON** - Data storage (RSS-ready)

## 📱 Features

- ✅ Dark theme со чисти бои
- ✅ Mobile-first responsive design
- ✅ Client-side search и filtering
- ✅ YouTube и Spotify embeds
- ✅ SEO-friendly структура
- ✅ RSS-ready architecture (лесна интеграција подоцна)
- ✅ Брзо loading (static files)
- ✅ Лесно deployment (GitHub Pages, Netlify, Vercel)

## 🚢 Deployment

### GitHub Pages:
1. Push кон GitHub repo
2. Settings → Pages → Source: "main branch"
3. Website ќе биде live на `https://username.github.io/repo-name`

### Netlify/Vercel:
1. Connect GitHub repo
2. Deploy automatic (no build step needed)

## 📝 Лиценца

Слободна употреба за твојот podcast! 🎉

---

**Изработено со ❤️ за podcasters**
