const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
let parcheggiRoma = { type: "FeatureCollection", features: [] };

// Servire i file statici presenti nella cartella root (es. manifest.json, sw.js, icone)
app.use(express.static(__dirname));

// Funzione per scaricare i dati dei parcheggi da OpenStreetMap
async function caricaDatiParcheggi() {
  console.log("⏳Caricamento in corso...");
  
  // Usiamo il server alternativo Kumi Systems (molto più rapido)
  const overpassUrl = 'https://overpass.kumi.systems/api/interpreter';
  
  // Scarica le vie con parcheggio entro 3 km dal centro di Roma
  const query = `
    [out:json][timeout:25];
    (
      way["parking:lane:both"](around:3000, 41.8988, 12.4883);
      way["parking:lane:right"](around:3000, 41.8988, 12.4883);
      way["parking:lane:left"](around:3000, 41.8988, 12.4883);
      way["amenity"="parking"](around:3000, 41.8988, 12.4883);
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query)
    });

    if (!response.ok) {
      throw new Error(`Risposta del server non valida: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Mappa le coordinate dei nodi
    const nodes = {};
    data.elements.forEach(el => {
      if (el.type === 'node') nodes[el.id] = [el.lon, el.lat];
    });

    // Costruisci le linee GeoJSON per ogni strada
    const features = [];
    data.elements.forEach(el => {
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
              orario: "In base alla segnaletica",
              posti: "Variabili"
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
    console.log(`✅ Caricamento completato! Trovate ${features.length} strade con parcheggi.`);
  } catch (err) {
    console.error("❌ Errore durante il caricamento:", err.message);
  }
}

// Avvia il caricamento dei dati all'avvio
caricaDatiParcheggi();

// Endpoint API per inviare le strade al frontend
app.get('/api/parcheggi', (req, res) => {
  res.json(parcheggiRoma);
});

// Servire la pagina principale index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Avvio del server sulla porta 3000 o sulla porta assegnata da Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server attivo sulla porta ${PORT}`);
});
