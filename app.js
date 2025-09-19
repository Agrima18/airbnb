// =================== IMPORTS ===================
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const MongoStore = require("connect-mongo");
const querystring = require("querystring");
const slugify = require("slugify");
const { Server } = require("socket.io");
const http = require("http");

// =================== MODELS ===================
const User = require("./models/user");
const Listing = require("./models/listing");
const Booking = require("./models/booking");
const Plan = require("./models/plan");
const Review = require("./models/review");
const ChatMessage = require("./models/chatMessage");

// =================== DB CONNECTION ===================
mongoose.connect("mongodb://127.0.0.1:27017/wanderlust")
  .then(() => console.log("DB Connected"))
  .catch(err => console.log("DB Error:", err));

// =================== APP CONFIG ===================
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "view"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

const sessionConfig = {
  store: MongoStore.create({ mongoUrl: "mongodb://127.0.0.1:27017/wanderlust" }),
  secret: "secretcode",
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 },
};
app.use(session(sessionConfig));
app.use(flash());

// =================== GLOBAL MIDDLEWARE ===================
app.use(async (req, res, next) => {
  // Flash messages
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");

  // Current user
  if (req.session.userId) {
    try {
      res.locals.currentUser = await User.findById(req.session.userId);
      res.locals.showSpinner = req.session.showSpinner || false;
      req.session.showSpinner = false;
    } catch {
      res.locals.currentUser = null;
      res.locals.showSpinner = false;
    }
  } else {
    res.locals.currentUser = null;
    res.locals.showSpinner = false;
  }
  next();
});

// =================== AUTH ROUTES ===================
// REGISTER
app.get("/listings/register", (req, res) => res.render("listings/register"));

app.post("/listings/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (await User.findOne({ email })) {
      req.flash("error", "Email already in use");
      return res.redirect("/listings/register");
    }

    let handle = "@" + username.toLowerCase().replace(/\s+/g, "");
    if (await User.findOne({ handle })) handle += Math.floor(Math.random() * 1000);

    const hash = await bcrypt.hash(password, 12);
    const user = new User({ username, email, handle, password: hash });
    await user.save();

    req.session.userId = user._id;
    req.session.showSpinner = true;
    req.flash("success", "Welcome to WanderLust!");
    res.redirect("/listings");
  } catch (err) {
    console.error(err);
    req.flash("error", "Registration failed");
    res.redirect("/listings/register");
  }
});

// LOGIN
app.get("/listings/login", (req, res) => {
  const successMsg = req.query.loggedOut ? "Logged out successfully!" : null;
  res.render("listings/login", { success: successMsg, error: req.flash("error")[0] });
});

app.post("/listings/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/listings/login");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      req.flash("error", "Invalid credentials");
      return res.redirect("/listings/login");
    }

    req.session.userId = user._id;
    req.flash("success", "Welcome back!");
    res.redirect("/listings");
  } catch (err) {
    console.error(err);
    req.flash("error", "Login failed");
    res.redirect("/listings/login");
  }
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) console.log(err);
    res.clearCookie("connect.sid");
    res.redirect("/listings/login?loggedOut=true");
  });
});

// =================== USER PROFILE ===================
app.get("/user/:handle", async (req, res) => {
  try {
    const user = await User.findOne({ handle: req.params.handle })
      .populate("wishlist")
      .populate("hostedListings")
      .populate({ path: "plans", populate: { path: "listings" } })
      .populate("followers")
      .populate("following");

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/listings");
    }

    const currentUser = req.session.userId ? await User.findById(req.session.userId) : null;
    let isFollowing = false;
    if (currentUser) isFollowing = user.followers.some(f => f._id.equals(currentUser._id));

    res.render("listings/user-public", { user, isFollowing, currentUser });
  } catch (err) {
    console.error(err);
    req.flash("error", "Cannot load profile");
    res.redirect("/listings");
  }
});

app.post("/user/:handle/follow", async (req, res) => {
  if (!req.session.userId) return res.redirect("/listings/login");

  const targetUser = await User.findOne({ handle: req.params.handle });
  const currentUser = await User.findById(req.session.userId);
  if (!targetUser || targetUser._id.equals(currentUser._id)) return res.redirect(`/user/${req.params.handle}`);

  const isFollowing = targetUser.followers.includes(currentUser._id);
  if (isFollowing) {
    targetUser.followers.pull(currentUser._id);
    currentUser.following.pull(targetUser._id);
  } else {
    targetUser.followers.push(currentUser._id);
    currentUser.following.push(targetUser._id);
  }

  await targetUser.save();
  await currentUser.save();
  res.redirect(`/user/${req.params.handle}`);
});

// =================== LISTINGS ===================
app.get("/listings", async (req, res) => {
  try {
    const perPage = 6;
    const page = parseInt(req.query.page) || 1;
    const { category, location, tax } = req.query;

    const query = {};
    if (category) query.category = category;
    if (location) query.location = new RegExp(location, "i");

    const listings = await Listing.find(query)
      .skip(perPage * (page - 1))
      .limit(perPage);

    const totalListings = await Listing.countDocuments(query);
    const totalPages = Math.ceil(totalListings / perPage);

    const queryObj = { ...req.query };
    delete queryObj.page;
    const queryStringWithoutPage = querystring.stringify(queryObj);

    res.render("listings/index", {
      listings,
      currentPage: page,
      totalPages,
      queryStringWithoutPage,
      tax
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to fetch listings");
    res.redirect("/listings");
  }
});

app.get("/listings/new", (req, res) => res.render("listings/new"));
app.post("/listings", async (req, res) => {
  try {
    const listing = new Listing(req.body.listing);
    listing.slug = slugify(listing.title, { lower: true, strict: true }) + "-" + Date.now();
    listing.host = req.session.userId;
    await listing.save();
    res.redirect(`/listings/${listing.slug}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to create listing");
    res.redirect("/listings/new");
  }
});

app.get("/listings/:slug", async (req, res) => {
  try {
    const listing = await Listing.findOne({ slug: req.params.slug }).populate({
      path: "reviews",
      populate: { path: "author" },
    });
    if (!listing) return res.redirect("/listings");

    const plans = req.session.userId ? await Plan.find({ user: req.session.userId }) : [];
    const messages = await ChatMessage.find({ listing: listing._id }).populate("sender");

    res.render("listings/show", { listing, plans, messages });
  } catch (err) {
    console.error(err);
    res.redirect("/listings");
  }
});

// =================== BOOKING ===================
app.post("/listings/booking", async (req, res) => {
  if (!req.session.userId) return res.redirect("/listings/login");

  const { listingId, startDate, endDate, guests, totalPrice } = req.body;
  const booking = new Booking({
    user: req.session.userId,
    listing: listingId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    guests: parseInt(guests),
    totalPrice: parseFloat(totalPrice),
  });
  await booking.save();
  req.flash("success", "Booking confirmed!");
  res.redirect(`/listings/booking/${booking._id}`);
});

app.get("/listings/booking/:id", async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("listing user");
  if (!booking) return res.redirect("/listings");
  res.render("listings/booking-success", { booking });
});

// =================== WISHLIST ===================
app.post("/wishlist/:listingId", async (req, res) => {
  if (!req.session.userId) return res.redirect("/listings/login");

  const user = await User.findById(req.session.userId);
  const listingId = req.params.listingId;
  if (user.wishlist.includes(listingId)) user.wishlist.pull(listingId);
  else user.wishlist.push(listingId);
  await user.save();
  res.redirect("back");
});

// =================== PLAN ===================
app.post("/plans", async (req, res) => {
  if (!req.session.userId) return res.redirect("/listings/login");

  const planData = req.body.plan;
  const plan = new Plan({ ...planData, user: req.session.userId });
  await plan.save();

  const user = await User.findById(req.session.userId);
  user.plans.push(plan._id);
  await user.save();

  req.flash("success", "Plan added!");
  res.redirect("back");
});

app.delete("/plans/:id", async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan || !plan.user.equals(req.session.userId)) return res.redirect("back");

  await Plan.findByIdAndDelete(req.params.id);
  const user = await User.findById(req.session.userId);
  user.plans.pull(req.params.id);
  await user.save();
  res.redirect("back");
});

// =================== REVIEWS ===================
app.post("/listings/:id/reviews", async (req, res) => {
  if (!req.session.userId) return res.redirect("/listings/login");

  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.redirect("/listings");

  const review = new Review({ ...req.body.review, author: req.session.userId });
  await review.save();

  listing.reviews.push(review._id);
  await listing.save();

  res.redirect("back");
});

app.delete("/listings/:id/reviews/:reviewId", async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review || !review.author.equals(req.session.userId)) return res.redirect("back");

  await Review.findByIdAndDelete(req.params.reviewId);
  const listing = await Listing.findById(req.params.id);
  listing.reviews.pull(req.params.reviewId);
  await listing.save();
  res.redirect("back");
});

// =================== CHAT SOCKET.IO ===================
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", socket => {
  socket.on("joinRoom", ({ listingId }) => socket.join(listingId));
  socket.on("sendMessage", async ({ listingId, message, sender }) => {
    const chat = new ChatMessage({ listing: listingId, message, sender, createdAt: new Date() });
    await chat.save();
    io.to(listingId).emit("receiveMessage", { message, sender, createdAt: chat.createdAt });
  });
});

// =================== SERVER ===================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

