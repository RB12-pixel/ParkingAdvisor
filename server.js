const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.static(__dirname));

let parcheggiRoma = { type: "FeatureCollection", features: [] };

// Carica i dati all'avvio istantaneamente dal file JSON salvato
try {
  if (fs.existsSync(path.join(__dirname, 'parcheggi.json'))) {
    const data = fs.readFileSync(path.join(__dirname, 'parcheggi.json'));
    parcheggiRoma = JSON.parse(data);
    console.log(`⚡ Dati caricati all'istante! ${parcheggiRoma.features.length} strade caricate.`);
  } else {
    console.log("⚠️ File parcheggi.json non trovato. Esegui prima 'node salva_dati.js'");
  }
} catch (err) {
  console.error("❌ Errore nella lettura del file parcheggi.json:", err.message);
}

app.get('/api/parcheggi', (req, res) => {
  res.json(parcheggiRoma);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server attivo sulla porta ${PORT}`);
});
