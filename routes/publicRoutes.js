// routes/publicRoutes.js
const express = require("express");
const db = require("../config/db");

const router = express.Router();

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// HOME / landing
router.get("/", async (req, res) => {
  req.activeNav = "home";
  res.locals.activeNav = "home";

  try {
    const events = await db("event_details")
      .leftJoin("event_templates", "event_details.event_template_id", "event_templates.event_template_id")
      .select(
        "event_details.event_details_id",
        "event_details.event_name",
        "event_details.event_date_start",
        "event_details.event_location",
        "event_templates.event_type",
        "event_templates.event_description"
      )
      .orderBy("event_details.event_date_start", "asc")
      .limit(6);

    const mappedEvents = events.map((e) => ({
      EventDetailsID: e.event_details_id,
      EventName: e.event_name,
      EventDateStartFormatted: formatDate(e.event_date_start),
      EventLocation: e.event_location,
      EventType: e.event_type || "Event",
      EventDescriptionShort: e.event_description
        ? e.event_description.slice(0, 120) + (e.event_description.length > 120 ? "…" : "")
        : "",
    }));

    res.render("public/home", {
      pageTitle: "Ella Rises",
      events: mappedEvents,
    });
  } catch (err) {
    console.error("Error loading home events:", err);
    res.render("public/home", {
      pageTitle: "Ella Rises",
      events: [],
    });
  }
});

// ABOUT
router.get("/about", (req, res) => {
  req.activeNav = "about";
  res.locals.activeNav = "about";

  res.render("public/about", {
    pageTitle: "About | Ella Rises",
  });
});

// PROGRAMS
router.get("/programs", (req, res) => {
  req.activeNav = "programs";
  res.locals.activeNav = "programs";

  res.render("public/programs", {
    pageTitle: "Programs | Ella Rises",
  });
});

// EVENTS LIST
router.get("/events", async (req, res) => {
  req.activeNav = "events";
  res.locals.activeNav = "events";

  try {
    const events = await db("event_details")
      .leftJoin("event_templates", "event_details.event_template_id", "event_templates.event_template_id")
      .select(
        "event_details.event_details_id",
        "event_details.event_name",
        "event_details.event_date_start",
        "event_details.event_location",
        "event_templates.event_type",
        "event_templates.event_description"
      )
      .orderBy("event_details.event_date_start", "asc");

    const mappedEvents = events.map((e) => ({
      EventDetailsID: e.event_details_id,
      EventName: e.event_name,
      EventDateStartFormatted: formatDate(e.event_date_start),
      EventLocation: e.event_location,
      EventType: e.event_type || "Event",
      EventDescriptionShort: e.event_description
        ? e.event_description.slice(0, 140) + (e.event_description.length > 140 ? "…" : "")
        : "",
    }));

    res.render("public/events-list", {
      pageTitle: "Events | Ella Rises",
      events: mappedEvents,
    });
  } catch (err) {
    console.error("Error loading events:", err);
    res.render("public/events-list", {
      pageTitle: "Events | Ella Rises",
      events: [],
    });
  }
});

// GET INVOLVED
router.get("/get-involved", (req, res) => {
  req.activeNav = "get-involved";
  res.locals.activeNav = "get-involved";

  res.render("public/get-involved", {
    pageTitle: "Get Involved | Ella Rises",
  });
});

// DONATE
router.get("/donate", (req, res) => {
  res.render("public/donate", {
    pageTitle: "Donate | Ella Rises",
  });
});

// IMPACT DASHBOARD
router.get("/impact", (req, res) => {
  res.render("public/impact-dashboard", {
    pageTitle: "Impact | Ella Rises",
  });
});

module.exports = router;
