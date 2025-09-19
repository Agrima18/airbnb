const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const planSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  listings: [
    {
      type: Schema.Types.ObjectId,
      ref: "Listing",
    },
  ],
  notes: String,
  startDate: Date,
  endDate: Date,
}, { timestamps: true });

module.exports = mongoose.model("Plan", planSchema);
