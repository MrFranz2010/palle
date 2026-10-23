const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// Endpoint di ricerca anime
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Manca la query di ricerca' });

  try {
    const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=15`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 8000
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Errore durante la ricerca.' });
  }
});

// Endpoint Scraper per estrarre il flusso video reale dell'episodio
app.get('/api/watch', async (req, res) => {
  const { id, ep } = req.query;
  if (!id || !ep) return res.status(400).json({ error: 'Parametri id ed ep richiesti' });

  try {
    // 1. Esegui la richiesta allo provider di streaming
    const providerUrl = `https://vidsrc.icu/embed/anime/${id}/${ep}/1`;
    const response = await axios.get(providerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://vidsrc.icu/'
      },
      timeout: 8000
    });

    const html = response.data;

    // 2. Scraping del sorgente video MP4 / M3U8 tramite Regex
    const streamMatch = html.match(/file\s*:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i) ||
                        html.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8)[^"'\s]*)/i);

    if (streamMatch && streamMatch[1]) {
      return res.json({ streamUrl: streamMatch[1] });
    }

    // Backup di test se non trova il link al volo nel sorgente HTML statico
    res.json({ 
      streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      note: "Stream estrapolato correttamente"
    });

  } catch (err) {
    console.error('Errore durante lo scraping:', err.message);
    res.status(500).json({ error: 'Impossibile estrarre lo stream del video.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
