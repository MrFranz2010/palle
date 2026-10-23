const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

// Ricerca anime con AniList GraphQL (veloce e stabile)
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
    const results = mediaList.map(item => ({
      mal_id: item.idMal || item.id,
      anilist_id: item.id,
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

// Endpoint per la riproduzione video (utilizza i server embed vidsrc v2)
app.get('/api/watch', async (req, res) => {
  const { id, ep } = req.query;
  if (!id || !ep) return res.status(400).json({ error: 'Parametri mancanti' });

  // Link diretto all'embed v2 stabile
  const streamUrl = `https://vidsrc.cc/v2/embed/anime/${id}/${ep}`;

  return res.json({ streamUrl });
});

// Avvio del server
try {
  app.listen(PORT, () => {
    console.log(`Server avviato correttamente sulla porta ${PORT}`);
  });
} catch (err) {
  console.error('Errore critico durante l\'avvio del server:', err);
}
