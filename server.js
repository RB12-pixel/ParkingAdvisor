const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.static(__dirname));

let parcheggiRoma = { type: "FeatureCollection", features: [] };

// Legge i dati di OpenStreetMap dal file locale (caricamento ISTANTANEO)
try {
  const filePath = path.join(__dirname, 'parcheggi_raw.json');
  if (fs.existsSync(filePath)) {
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Convertiamo i dati grezzi di OSM in linee colorate per Leaflet
    const nodes = {};
    rawData.elements.forEach(el => {
      if (el.type === 'node') nodes[el.id] = [el.lon, el.lat];
    });

    const features = [];
    rawData.elements.forEach(el => {
      if (el.type === 'way' && el.nodes) {
        const coords = el.nodes.map(id => nodes[id]).filter(Boolean);
        if (coords.length > 1) {
          const tags = el.tags || {};
          const nomeVia = tags.name || "Tratto Parcheggio";
          
          let colore = "#0088FF"; // Blu
          let tipo = "blu";
          let tariffa = "A pagamento / Disco orario";

          const parkingTag = tags["parking:lane:both"] || tags["parking:lane:right"] || tags["parking:lane:left"] || "";

          if (parkingTag.includes("free") || tags["fee"] === "no") {
            colore = "#FFFFFF"; // Bianco
            tipo = "bianca";
            tariffa = "Gratuito";
          } else if (parkingTag.includes("disabled") || parkingTag.includes("loading") || tags["amenity"] === "parking") {
            colore = "#FFCC00"; // Giallo
            tipo = "gialla";
            tariffa = "Riservato / Stallo";
          }

          features.push({
            type: "Feature",
            properties: {
              via: nomeVia,
              colore: colore,
              tipo: tipo,
              tariffa: tariffa,
              orario: "In base alla segnaletica"
            },
            geometry: {
              type: "LineString",
              coordinates: coords
            }
          });
        }
      }
    });

    parcheggiRoma.features = features;
    console.log(`⚡ Dati OpenStreetMap caricati all'istante! Trovate ${features.length} strade.`);
  }
} catch (err) {
  console.error("❌ Errore nella lettura del file:", err.message);
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
