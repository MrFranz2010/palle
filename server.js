const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Manca la query di ricerca' });

  const term = query.trim();

  try {
    // Interrogazione in tempo reale dell'API ufficiale con User-Agent per evitare blocchi
    const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(term)}&limit=15`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });
    
    res.json(response.data);
  } catch (err) {
    console.error('Errore durante la richiesta all’API esterna:', err.message);
    res.status(500).json({ error: 'Impossibile completare la ricerca in tempo reale sul server esterno.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server backend attivo sulla porta ${PORT}`);
});
