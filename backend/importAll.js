const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const Taluka = require("./models/Taluka");
const Village = require("./models/Village");
const Road = require("./models/Road");
const Lulc = require("./models/Lulc");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected for Import"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

async function importData() {
  const datasets = [
    { model: Taluka, file: "talukas.geojson", name: "Talukas" },
    { model: Village, file: "villages.geojson", name: "Villages" },
    { model: Road, file: "roads.geojson", name: "Roads" },
    { model: Lulc, file: "lulc.geojson", name: "LULC" }
  ];

  try {
    for (const dataset of datasets) {
      console.log(`Processing ${dataset.name}...`);
      const dataPath = path.join(__dirname, `../data/${dataset.file}`);
      
      let data;
      try {
        const fileContent = fs.readFileSync(dataPath, "utf8");
        data = JSON.parse(fileContent);
      } catch (e) {
        console.error(`Error reading ${dataset.file}:`, e.message);
        continue;
      }

      console.log(`Clearing ${dataset.name}...`);
      await dataset.model.deleteMany();
      
      console.log(`Inserting ${data.features.length} features into ${dataset.name}...`);
      
      // Batch insert for large datasets like villages
      const batchSize = 5000;
      for (let i = 0; i < data.features.length; i += batchSize) {
        const batch = data.features.slice(i, i + batchSize);
        await dataset.model.insertMany(batch);
        console.log(`Inserted batch ${i} to ${i + batch.length} of ${data.features.length}`);
      }
      
      console.log(`${dataset.name} Imported Successfully!`);
    }
  } catch (error) {
    console.error("Error importing data:", error);
  } finally {
    process.exit();
  }
}

importData();
