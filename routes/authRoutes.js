// routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/db");

const router = express.Router();
const SALT_ROUNDS = 10;

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : "";
}

// GET /login
router.get("/login", (req, res) => {
  req.activeNav = "login";
  res.locals.activeNav = "login";

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
    // user_account (snake_case)
    const user = await db("user_account")
      .where({ email: normalizedEmail })
      .first();

    if (!user) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }

    if (user.is_active === false) {
      req.flash("error", "This account is currently inactive.");
      return res.redirect("/login");
    }

    const passwordsMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordsMatch) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }

    // Find participant (prefer by user_id, fallback by email)
    let participant = null;

    if (user.user_id) {
      participant = await db("participant_info")
        .where({ user_id: user.user_id })
        .first();
    }

    if (!participant) {
      participant = await db("participant_info")
        .where({ participant_email: normalizedEmail })
        .first();
    }

    req.session.user = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      participantId: participant ? participant.participant_id : null,
      firstName: participant ? participant.participant_first_name : null,
      lastName: participant ? participant.participant_last_name : null,
    };

    req.flash("success", "Welcome back to Ella Rises.");

    if (user.role === "admin") {
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
    await db.transaction(async (trx) => {
      // 1) Does a user already exist with this email?
      const existingUser = await trx("user_account")
        .where({ email: normalizedEmail })
        .first();

      if (existingUser) {
        req.flash("error", "An account with that email already exists. Please log in.");
        throw new Error("ABORT_REDIRECT_LOGIN");
      }

      // 2) Existing participant from old data?
      const existingParticipant = await trx("participant_info")
        .where({ participant_email: normalizedEmail })
        .first();

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // 3) Create the new user_account row
      const [newUser] = await trx("user_account")
        .insert({
          email: normalizedEmail,
          password_hash: passwordHash,
          role: "user",
          is_active: true,
        })
        .returning("*");

      let participant;

      if (existingParticipant) {
        // Attach login to existing participant
        const [updatedParticipant] = await trx("participant_info")
          .where({ participant_id: existingParticipant.participant_id })
          .update({
            user_id: newUser.user_id,
            participant_first_name:
              existingParticipant.participant_first_name || firstName.trim(),
            participant_last_name:
              existingParticipant.participant_last_name || lastName.trim(),
          })
          .returning("*");

        participant = updatedParticipant;
      } else {
        // Brand new participant
        const [newParticipant] = await trx("participant_info")
          .insert({
            participant_email: normalizedEmail,
            participant_first_name: firstName.trim(),
            participant_last_name: lastName.trim(),
            user_id: newUser.user_id,
          })
          .returning("*");

        participant = newParticipant;
      }

      // 4) Save session
      req.session.user = {
        userId: newUser.user_id,
        email: newUser.email,
        role: newUser.role,
        participantId: participant.participant_id,
        firstName: participant.participant_first_name,
        lastName: participant.participant_last_name,
      };

      req.flash("success", "Your account was created. Welcome to Ella Rises.");
    });

    return res.redirect("/my-journey");
  } catch (err) {
    if (err.message === "ABORT_REDIRECT_LOGIN") {
      return res.redirect("/login");
    }

    console.error("Error during signup:", err);

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
