const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const District = require("./models/District");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected for Import"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const dataPath = path.join(__dirname, "../data/districts.geojson");
let data;

try {
  const fileContent = fs.readFileSync(dataPath, "utf8");
  data = JSON.parse(fileContent);
} catch (error) {
  console.error("Error reading or parsing districts.geojson:", error);
  process.exit(1);
}

async function importData() {
  try {
    console.log("Clearing existing District data...");
    await District.deleteMany();
    
    console.log("Inserting new District data...");
    await District.insertMany(data.features);
    
    console.log("Data Imported Successfully!");
  } catch (error) {
    console.error("Error importing data:", error);
  } finally {
    process.exit();
  }
}

importData();
