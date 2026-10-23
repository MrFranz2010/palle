const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// 1. RICERCA ANIME (AniList GraphQL - Nessun blocco 429)
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Manca la query di ricerca' });

  const graphqlQuery = `
    query ($search: String) {
      Page(perPage: 15) {
        media(search: $search, type: ANIME) {
          id
          idMal
          title {
            romaji
            english
            native
          }
          coverImage {
            large
          }
          episodes
          averageScore
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      'https://graphql.anilist.co',
      {
        query: graphqlQuery,
        variables: { search: query }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 8000
      }
    );

    const mediaList = response.data?.data?.Page?.media || [];
    
    // Mappiamo la risposta nel formato che si aspetta il frontend
    const results = mediaList.map(item => ({
      mal_id: item.idMal || item.id,
      title: item.title.english || item.title.romaji || item.title.native,
      images: { jpg: { image_url: item.coverImage.large } },
      episodes: item.episodes || '?',
      score: item.averageScore ? (item.averageScore / 10).toFixed(1) : 'N/D'
    }));

    return res.json({ data: results });
  } catch (err) {
    console.error('Errore ricerca AniList:', err.message);
    return res.status(500).json({ error: 'Errore nella ricerca anime', details: err.message });
  }
});

// 2. SCRAPING ANIMEUNITY PER I VIDEO
app.get('/api/watch', async (req, res) => {
  const { title, ep } = req.query;
  if (!title || !ep) return res.status(400).json({ error: 'Parametri mancanti' });

  try {
    // Cerca l'anime su AnimeUnity
    const searchRes = await axios.get(`https://animeunity.co/api/search?value=${encodeURIComponent(title)}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 8000
    });

    const animeList = searchRes.data.data || searchRes.data;
    if (!animeList || animeList.length === 0) {
      throw new Error('Anime non trovato su AnimeUnity');
    }

    const anime = animeList[0];
    const episodesRes = await axios.get(`https://animeunity.co/api/anime/${anime.id}/${anime.slug}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 8000
    });

    const episodes = episodesRes.data.episodes || [];
    const targetEp = episodes.find(e => String(e.num) === String(ep)) || episodes[ep - 1];

    if (!targetEp) throw new Error('Episodio non trovato');

    return res.json({ 
      streamUrl: targetEp.link || `https://animeunity.co/video/${targetEp.id}`
    });

  } catch (err) {
    console.error('Errore scraping:', err.message);
    // Stream di fallback in caso di blocchi/CORS diretti dal video
    return res.json({ 
      streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
