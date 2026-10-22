const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Rotta per la ricerca globale di tutti gli anime
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Manca la query di ricerca' });

  try {
    const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=15`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Errore nel recupero dei dati dal server esterno' });
  }
});

app.listen(PORT, () => {
  console.log(`Server backend attivo sulla porta ${PORT}`);
});