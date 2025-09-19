const express = require('express');
const router = express.Router();
const Booking = require('../models/booking');
const Listing = require('../models/listing');
const { isLoggedIn } = require('../middleware');

// ✅ POST /bookings/:id/book - Create Booking
router.post('/:id/book', isLoggedIn, async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  const { startDate, endDate, guests } = req.body;

  // 🔐 Check overlapping bookings
  const overlapping = await Booking.findOne({
    listing: listing._id,
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  });

  if (overlapping) {
    req.flash("error", "Listing already booked for selected dates.");
    return res.redirect(`/listings/${listing._id}`);
  }

  const days = (new Date(endDate) - new Date(startDate)) / (1000 * 3600 * 24);
  const totalPrice = listing.taxIncluded
    ? listing.price * 1.18 * days
    : listing.price * days;

  const booking = new Booking({
    user: req.session.user_id, // ✅ FIXED THIS LINE
    listing: listing._id,
    startDate,
    endDate,
    guests,
    totalPrice,
  });

  await booking.save();
  req.flash("success", "Booking successful!");
  res.redirect(`/bookings/${booking._id}`);
});

// ✅ GET /bookings/:id - Show booking confirmation
router.get('/:id', isLoggedIn, async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('listing')
    .populate('user');

  if (!booking) {
    req.flash("error", "Booking not found.");
    return res.redirect("/listings");
  }

  res.render('bookings/show', { booking });
});

module.exports = router;
