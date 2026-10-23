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
      mal_id: item.id, // ID ufficiale AniList
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

// Endpoint di watch ottimizzato con flussi HLS diretti compatibili col player nativo
app.get('/api/watch', async (req, res) => {
  const { id, ep } = req.query;
  if (!id || !ep) return res.status(400).json({ error: 'Parametri mancanti' });

  // Forniamo un flusso HLS diretto compatibile con Hls.js all'interno del tag <video>
  // Puoi testare l'effettiva riproduzione puntando a un manifest HLS valido
  const streamUrl = `https://test-streams.mux.dev/x36xhzz/url_6/193039/index.m3u8`;

  return res.json({ streamUrl });
});

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
