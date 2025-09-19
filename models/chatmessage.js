const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatMessageSchema = new Schema({
  room: String,
  message: String,
  sender: { type: Schema.Types.ObjectId, ref: "User" },
  avatar: String,
  timestamp: Date,
  status: {
    type: String,
    enum: ["delivered", "read"],
    default: "delivered",
  },
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
