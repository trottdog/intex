// routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/db");

const router = express.Router();
const SALT_ROUNDS = 10;

// Helper: normalize emails
function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : "";
}

// GET /login
router.get("/login", (req, res) => {
  req.activeNav = "login";
  res.locals.activeNav = "login";

  // If already logged in, redirect to appropriate home
  if (req.session.user) {
    if (req.session.user.role === "admin") {
      return res.redirect("/manage");
    }
    return res.redirect("/my-journey");
  }

  res.render("auth/login", {
    pageTitle: "Login | Ella Rises",
  });
});

// POST /login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    req.flash("error", "Please enter both email and password.");
    return res.redirect("/login");
  }

  try {
    const user = await db("UserAccount")
      .where({ Email: normalizedEmail })
      .first();

    if (!user) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }

    if (!user.IsActive) {
      req.flash("error", "This account is currently inactive.");
      return res.redirect("/login");
    }

    const passwordsMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!passwordsMatch) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }

    // Lookup participant if exists
    const participant = await db("ParticipantInfo")
      .where({ UserID: user.UserID })
      .first();

    req.session.user = {
      userId: user.UserID,
      email: user.Email,
      role: user.Role,
      participantId: participant ? participant.ParticipantID : null,
      firstName: participant ? participant.ParticipantFirstName : null,
      lastName: participant ? participant.ParticipantLastName : null,
    };

    req.flash("success", "Welcome back to Ella Rises.");

    if (user.Role === "admin") {
      return res.redirect("/manage");
    }
    return res.redirect("/my-journey");
  } catch (err) {
    console.error("Error logging in:", err);
    req.flash("error", "Something went wrong. Please try again.");
    return res.redirect("/login");
  }
});

// GET /signup
router.get("/signup", (req, res) => {
  req.activeNav = "signup";
  res.locals.activeNav = "signup";

  if (req.session.user) {
    if (req.session.user.role === "admin") {
      return res.redirect("/manage");
    }
    return res.redirect("/my-journey");
  }

  res.render("auth/register", {
    pageTitle: "Create Account | Ella Rises",
  });
});

// POST /signup
router.post("/signup", async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!firstName || !lastName || !normalizedEmail || !password || !confirmPassword) {
    req.flash("error", "Please fill out all required fields.");
    return res.redirect("/signup");
  }

  if (password !== confirmPassword) {
    req.flash("error", "Passwords do not match.");
    return res.redirect("/signup");
  }

  try {
    // Check if email already used
    const existingUser = await db("UserAccount")
      .where({ Email: normalizedEmail })
      .first();

    if (existingUser) {
      req.flash("error", "An account with that email already exists.");
      return res.redirect("/signup");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user account
    const [newUser] = await db("UserAccount")
      .insert({
        Email: normalizedEmail,
        PasswordHash: passwordHash,
        Role: "user",
        IsActive: true,
      })
      .returning("*");

    // Create linked participant record
    const [participant] = await db("ParticipantInfo")
      .insert({
        ParticipantEmail: normalizedEmail,
        ParticipantFirstName: firstName.trim(),
        ParticipantLastName: lastName.trim(),
        UserID: newUser.UserID,
      })
      .returning("*");

    // Store in session
    req.session.user = {
      userId: newUser.UserID,
      email: newUser.Email,
      role: newUser.Role,
      participantId: participant.ParticipantID,
      firstName: participant.ParticipantFirstName,
      lastName: participant.ParticipantLastName,
    };

    req.flash("success", "Your account was created. Welcome to Ella Rises.");
    return res.redirect("/my-journey");
  } catch (err) {
    console.error("Error during signup:", err);

    // Unique constraint on ParticipantEmail could also trigger here
    if (err.code === "23505") {
      req.flash("error", "An account or participant with that email already exists.");
    } else {
      req.flash("error", "Something went wrong while creating your account.");
    }

    return res.redirect("/signup");
  }
});

// POST /logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/");
  });
});

module.exports = router;
