const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Servire i file statici (index.html, manifest.json, sw.js, ecc.)
app.use(express.static(__dirname));

// Variabile in memoria per contenere i parcheggi elaborati
let parcheggiRoma = { type: "FeatureCollection", features: [] };

// Funzione che legge solo parcheggi_raw.json all'avvio del server
function caricaParcheggi() {
  const filePath = path.join(__dirname, 'parcheggi_raw.json');
  
  if (!fs.existsSync(filePath)) {
    console.error("❌ ERRORE: File 'parcheggi_raw.json' non trovato nella repository!");
    return;
  }

  try {
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const nodes = {};

    // 1. Mappiamo tutti i nodi (coordinate lat/lon)
    if (rawData.elements) {
      rawData.elements.forEach(el => {
        if (el.type === 'node') {
          nodes[el.id] = [el.lon, el.lat];
        }
      });

      const features = [];

      // 2. Creiamo le strade e assegniamo i colori (Blu, Bianco, Giallo)
      rawData.elements.forEach(el => {
        if (el.type === 'way' && el.nodes) {
          const coords = el.nodes.map(id => nodes[id]).filter(Boolean);
          if (coords.length > 1) {
            const tags = el.tags || {};
            const nomeVia = tags.name || "Tratto Parcheggio";
            
            let colore = "#0088FF"; // Default: Blu
            let tipo = "blu";
            let tariffa = "A pagamento / Disco orario";

            const parkingTag = tags["parking:lane:both"] || tags["parking:lane:right"] || tags["parking:lane:left"] || "";

            if (parkingTag.includes("free") || tags["fee"] === "no") {
              colore = "#FFFFFF"; // Strisce bianche
              tipo = "bianca";
              tariffa = "Gratuito";
            } else if (parkingTag.includes("disabled") || parkingTag.includes("loading") || tags["amenity"] === "parking") {
              colore = "#FFCC00"; // Strisce gialle
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
      console.log(`⚡ Dati caricati con successo da parcheggi_raw.json! Trovate ${features.length} strade.`);
    }
  } catch (err) {
    console.error("❌ Errore nella lettura di parcheggi_raw.json:", err.message);
  }
}

// Eseguiamo il caricamento all'avvio del server
caricaParcheggi();

// API per la mappa
app.get('/api/parcheggi', (req, res) => {
  res.json(parcheggiRoma);
});

// Pagina principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Avvio server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server attivo sulla porta ${PORT}`);
});
