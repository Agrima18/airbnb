// =================== IMPORTS ===================
const mongoose = require("mongoose");
const Listing = require("../models/listing");  // ✅ relative path
const { data: sampleListings } = require("./data"); // ✅ relative path

// =================== DB CONNECTION ===================
mongoose.connect("mongodb://127.0.0.1:27017/wanderlust")
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ Mongo connection error:", err);
  });

// =================== SEED FUNCTION ===================
const initDB = async () => {
  try {
    // Clear old listings
    await Listing.deleteMany({});
    console.log("🗑️ Old listings removed");

    // Insert sample data
    await Listing.insertMany(sampleListings);
    console.log("✅ Sample listings added successfully");

    mongoose.connection.close(); // close connection after insert
    console.log("🔒 MongoDB connection closed");
  } catch (err) {
    console.error("❌ Error seeding database:", err);
  }
};

// =================== RUN ===================
initDB();

