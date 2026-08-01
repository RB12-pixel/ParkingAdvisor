const fetch = require('node-fetch');
const fs = require('fs');

async function generaCache() {
  console.log("⏳ Scaricamento dati da OpenStreetMap in corso...");
  const overpassUrl = 'https://overpass.kumi.systems/api/interpreter';
  
  const query = `
    [out:json][timeout:60];
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

    const data = await response.json();
    const nodes = {};
    data.elements.forEach(el => {
      if (el.type === 'node') nodes[el.id] = [el.lon, el.lat];
    });

    const features = [];
    data.elements.forEach(el => {
      if (el.type === 'way' && el.nodes) {
        const coords = el.nodes.map(id => nodes[id]).filter(Boolean);
        if (coords.length > 1) {
          const tags = el.tags || {};
          const nomeVia = tags.name || "Tratto Parcheggio";
          let colore = "#0088FF";
          let tipo = "blu";
          let tariffa = "A pagamento / Disco orario";

          const parkingTag = tags["parking:lane:both"] || tags["parking:lane:right"] || tags["parking:lane:left"] || "";

          if (parkingTag.includes("free") || tags["fee"] === "no") {
            colore = "#FFFFFF";
            tipo = "bianca";
            tariffa = "Gratuito";
          } else if (parkingTag.includes("disabled") || parkingTag.includes("loading") || tags["amenity"] === "parking") {
            colore = "#FFCC00";
            tipo = "gialla";
            tariffa = "Riservato / Stallo";
          }

          features.push({
            type: "Feature",
            properties: { via: nomeVia, colore: colore, tipo: tipo, tariffa: tariffa, orario: "In base alla segnaletica" },
            geometry: { type: "LineString", coordinates: coords }
          });
        }
      }
    });

    const geojson = { type: "FeatureCollection", features: features };
    fs.writeFileSync('parcheggi.json', JSON.stringify(geojson));
    console.log(`✅ File parcheggi.json salvato con successo! ${features.length} strade trovate.`);
  } catch (err) {
    console.error("❌ Errore:", err.message);
  }
}

generaCache();
