const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  wishlist: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }], default: [] },
  plans: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Plan" }], default: [] },
  hostedListings: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }], default: [] },
  followers: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
  following: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
  profilePic: { type: String, default: "https://via.placeholder.com/150" },
  bio: { type: String, default: "" }
});

module.exports = mongoose.model("User", userSchema);

