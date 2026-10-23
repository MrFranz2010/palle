const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// Ricerca anime stabile tramite AniList GraphQL
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Manca la query di ricerca' });

  const graphqlQuery = `
    query ($search: String) {
      Page(perPage: 15) {
        media(search: $search, type: ANIME) {
          id
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
      { query: graphqlQuery, variables: { search: query } },
      { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 8000 }
    );

    const mediaList = response.data?.data?.Page?.media || [];
    const results = mediaList.map(item => ({
      mal_id: item.id,
      title: item.title.english || item.title.romaji || item.title.native,
      images: { jpg: { image_url: item.coverImage.large } },
      episodes: item.episodes || '?',
      score: item.averageScore ? (item.averageScore / 10).toFixed(1) : 'N/D'
    }));

    return res.json({ data: results });
  } catch (err) {
    console.error('Errore ricerca:', err.message);
    return res.status(500).json({ error: 'Errore nella ricerca', details: err.message });
  }
});

// Endpoint di watch per fornire il flusso video diretto o un fallback compatibile
app.get('/api/watch', async (req, res) => {
  const { id, ep } = req.query;
  if (!id || !ep) return res.status(400).json({ error: 'Parametri mancanti' });

  // Forniamo un flusso HLS pubblico di test/fallback o l'URL elaborato
  // Questo evita il blocco degli iframe perché gestito direttamente via tag video nativo
  return res.json({ 
    streamUrl: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`, 
    note: "Flusso di test HTML5 nativo per bypassare i blocchi iframe" 
  });
});

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
