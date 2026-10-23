const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// 1. Ricerca anime (usa Jikan API per trovare i titoli corretti)
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Manca la query di ricerca' });

  try {
    const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=15`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    return res.json(response.data);
  } catch (err) {
    console.error('Errore ricerca Jikan:', err.message);
    return res.json({ data: [] });
  }
});

// 2. Scraper per AnimeUnity
app.get('/api/watch', async (req, res) => {
  const { title, ep } = req.query; // Riceviamo il titolo dell'anime e il numero dell'episodio
  if (!title || !ep) return res.status(400).json({ error: 'Parametri titolo ed ep richiesti' });

  try {
    // Cerchiamo l'anime su AnimeUnity tramite la loro API di ricerca interna
    const searchRes = await axios.get(`https://animeunity.to/api/search?value=${encodeURIComponent(title)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest' },
      timeout: 8000
    });

    const animeList = searchRes.data.data || searchRes.data;
    if (!animeList || animeList.length === 0) {
      throw new Error('Anime non trovato su AnimeUnity');
    }

    const anime = animeList[0]; // Prendiamo il primo risultato corrispondente
    const animeId = anime.id;
    const animeSlug = anime.slug;

    // Recuperiamo la lista degli episodi per quell'anime
    const episodesRes = await axios.get(`https://animeunity.to/api/anime/${animeId}/${animeSlug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest' },
      timeout: 8000
    });

    // Troviamo l'episodio specifico richiesto
    const episodes = episodesRes.data.episodes || [];
    const targetEp = episodes.find(e => String(e.num) === String(ep)) || episodes[ep - 1];

    if (!targetEp) {
      throw new Error('Episodio non trovato');
    }

    // Estraiamo il link del video associato all'episodio su AnimeUnity
    const watchUrl = `https://animeunity.to/video/${targetEp.id}`;
    
    // Restituiamo l'embed o il link diretto ricavato
    return res.json({ 
      streamUrl: targetEp.link || watchUrl,
      source: 'AnimeUnity'
    });

  } catch (err) {
    console.error('Errore scraping AnimeUnity:', err.message);
    // Fallback di sicurezza in caso di blocco o errore dello scraper
    return res.json({ 
      streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
