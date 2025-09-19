// middleware.js
const Booking = require("./models/booking");
const Listing = require("./models/listing");

// ✅ Check if user is logged in
function isLoggedIn(req, res, next) {
  if (!req.session.user_id) {
    req.flash("error", "You must be logged in first.");
    return res.redirect("/listings/login");
  }
  next();
}

// 📅 Prevent double booking (overlapping dates)
async function validateBookingDates(req, res, next) {
  const listing = await Listing.findById(req.params.id);
  const { startDate, endDate } = req.body;

  const overlapping = await Booking.findOne({
    listing: listing._id,
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    ]
  });

  if (overlapping) {
    req.flash("error", "This listing is already booked for the selected dates.");
    return res.redirect(`/listings/${listing.slug}`);
  }

  next();
}

module.exports = {
  isLoggedIn,
  validateBookingDates,
};