const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Servire i file statici (index.html, manifest.json, sw.js, ecc.)
app.use(express.static(__dirname));

// Caricamento istantaneo dal file JSON salvato su GitHub
let parcheggiRoma = { type: "FeatureCollection", features: [] };

try {
  const filePath = path.join(__dirname, 'parcheggi.json');
  if (fs.existsSync(filePath)) {
    const rawData = fs.readFileSync(filePath, 'utf8');
    parcheggiRoma = JSON.parse(rawData);
    console.log("⚡ Dati parcheggi caricati in memoria all'istante!");
  } else {
    console.log("⚠️ File parcheggi.json non trovato nella repository.");
  }
} catch (err) {
  console.error("❌ Errore nella lettura del file parcheggi.json:", err.message);
}

// API endpoint che risponde in pochissimi millisecondi
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
