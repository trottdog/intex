// index.js
require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const helmet = require("helmet");
const csrf = require("csurf");
const expressLayouts = require("express-ejs-layouts");

const publicRoutes = require("./routes/publicRoutes");
const authRoutes = require("./routes/authRoutes");
const myJourneyRoutes = require("./routes/myJourneyRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Layouts
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'", "https://cdn.jsdelivr.net"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:"],
        styleSrc: ["'self'", "'unsafe-inline'"], // if you have inline styles
      },
    },
  })
);

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

// Flash messages
app.use(flash());

// CSRF protection
const csrfProtection = csrf();
app.use(csrfProtection);

// Locals middleware (user, flash, csrfToken)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.info = req.flash("info");

  // Only generate token when session & CSRF middleware are initialized
  try {
    res.locals.csrfToken = req.csrfToken();
  } catch (err) {
    res.locals.csrfToken = "";
  }

  next();
});

// Simple helper for setting active nav (set `req.activeNav` in routes)
app.use((req, res, next) => {
  res.locals.activeNav = req.activeNav || "";
  next();
});

// Routes
app.use("/", publicRoutes);
app.use("/", authRoutes);
app.use("/", myJourneyRoutes);

// CSRF error handler
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    req.flash("error", "Your session expired. Please try again.");
    return res.status(403).redirect("back");
  }
  return next(err);
});

// 404
app.use((req, res) => {
  res.status(404).render("errors/404", {
    pageTitle: "Page Not Found",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
