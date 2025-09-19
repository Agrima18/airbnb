const express = require("express");
const router = express.Router();
const axios = require("axios");

// ✅ Flights
router.get("/flights", async (req, res) => {
  const { origin, destination, date } = req.query;
  if (!origin || !destination || !date) return res.status(400).json({ error: "Missing params" });

  const flights = [
    { flightNumber: "AI101", departure: "08:00", arrival: "10:30" },
    { flightNumber: "AI202", departure: "14:00", arrival: "16:30" }
  ];
  res.json({ flights });
});

// ✅ Trains
router.get("/trains", async (req, res) => {
  const { origin, destination, date } = req.query;
  if (!origin || !destination || !date) return res.status(400).json({ error: "Missing params" });

  const trains = [
    { trainNumber: "12345", departure: "07:00", arrival: "11:00" },
    { trainNumber: "67890", departure: "18:00", arrival: "22:00" }
  ];
  res.json({ trains });
});

// ✅ Hotels
router.get("/hotels", async (req, res) => {
  const { location } = req.query;
  if (!location) return res.status(400).json({ error: "Missing location" });

  const hotels = [
    { name: "Hotel Sunshine", rating: 4.2 },
    { name: "City View Inn", rating: 4.5 }
  ];
  res.json({ hotels });
});

// ✅ Holidays — FIXED HERE
router.get("/holidays/:country", async (req, res) => {
  const { country } = req.params;
  const year = new Date().getFullYear();
  try {
    const response = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
    const holidayDates = response.data.map(h => h.date);
    res.json({ holidayDates });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch holidays" });
  }
});

module.exports = router;
