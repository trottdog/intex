// routes/manageRoutes.js
const express = require("express");
const router = express.Router();
const { isAdmin } = require("../config/auth");

// GET /manage  -> redirect to dashboard
router.get("/manage", isAdmin, (req, res) => {
  // This keeps the header "Manage" link working and lands on the dashboard
  return res.redirect("/manage/dashboard");
});

// GET /manage/dashboard  -> render manage/dashboard.ejs
router.get("/manage/dashboard", isAdmin, (req, res) => {
  // This will use layouts/manage.ejs as the shell
  res.render("manage/dashboard", {
    layout: "layouts/manage",     // 👈 use the manage shell
    pageTitle: "Admin Dashboard",
    sidebarActive: "dashboard",   // for your Manage sidebar highlighting
  });
});

module.exports = router;
