const fs = require('fs');
const path = require('path');

const layers = ['districts.geojson', 'talukas.geojson', 'villages.geojson', 'lulc.geojson'];

layers.forEach(layer => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, `../data/${layer}`), 'utf8'));
    console.log(`\n--- Properties of ${layer} (first feature) ---`);
    console.log(Object.keys(data.features[0].properties));
    console.log(data.features[0].properties);
  } catch(e) {
    console.log(`Failed to read ${layer}: ${e.message}`);
  }
});
