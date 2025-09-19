const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  image: {
    type: String,
    default: "https://via.placeholder.com/300", // fallback if no image
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  location: String,
  country: String,
  category: String,
  actionType: {
    type: String,
    enum: ["book", "reserve", "check", "plan"],
    default: "book",
  },
  host: {
    type: String, // if you want to link with User: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    required: true,
  },
  slug: {
    type: String,
    unique: true,
  },

  // ✅ reviews will be stored in separate Review collection
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;
