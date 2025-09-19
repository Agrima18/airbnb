const express = require("express");
const router = express.Router();
const Plan = require("../models/plan");
const Listing = require("../models/listing");

// ✅ Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (!req.session.user_id) {
    req.flash("error", "You must be logged in first.");
    return res.redirect("/listings/login");
  }
  next();
}

// 📄 Show all plans of the current user
router.get("/", isLoggedIn, async (req, res) => {
  const plans = await Plan.find({ user: req.session.user_id }).populate("listings");
  res.render("plans/index", { plans });
});

// ➕ Create new plan and add a listing to it
router.post("/create-and-add/:listingId", isLoggedIn, async (req, res) => {
  const { title, startDate, endDate, notes } = req.body;
  const { listingId } = req.params;

  const newPlan = new Plan({
    title,
    startDate,
    endDate,
    notes,
    user: req.session.user_id,
    listings: [listingId],
  });

  await newPlan.save();
  req.flash("success", "Plan created and listing added!");
  res.redirect(`/listings/${listingId}`);
});

// ➕ Add a listing to an existing plan
router.post("/add/:listingId", isLoggedIn, async (req, res) => {
  const { planId } = req.body;
  const { listingId } = req.params;

  const plan = await Plan.findById(planId);
  if (!plan) {
    req.flash("error", "Plan not found.");
    return res.redirect(`/listings/${listingId}`);
  }

  if (!plan.listings.includes(listingId)) {
    plan.listings.push(listingId);
    await plan.save();
  }

  req.flash("success", "Listing added to your plan!");
  res.redirect(`/listings/${listingId}`);
});

// ❌ Delete a plan
router.delete("/:id", isLoggedIn, async (req, res) => {
  await Plan.findByIdAndDelete(req.params.id);
  req.flash("success", "Plan deleted.");
  res.redirect("/plans");
});

module.exports = router;
