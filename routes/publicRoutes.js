// routes/publicRoutes.js
const express = require("express");
const db = require("../config/db");

const router = express.Router();

// Helper to format dates nicely (simple version)
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
    // Example: fetch a few upcoming events
    const events = await db("EventDetails")
      .leftJoin("EventTemplates", "EventDetails.EventTemplateID", "EventTemplates.EventTemplateID")
      .select(
        "EventDetails.EventDetailsID",
        "EventDetails.EventName",
        "EventDetails.EventDateStart",
        "EventDetails.EventLocation",
        "EventTemplates.EventType",
        "EventTemplates.EventDescription"
      )
      .orderBy("EventDetails.EventDateStart", "asc")
      .limit(6);

    const mappedEvents = events.map((e) => ({
      EventDetailsID: e.EventDetailsID,
      EventName: e.EventName,
      EventDateStartFormatted: formatDate(e.EventDateStart),
      EventLocation: e.EventLocation,
      EventType: e.EventType || "Event",
      EventDescriptionShort: e.EventDescription
        ? e.EventDescription.slice(0, 120) + (e.EventDescription.length > 120 ? "…" : "")
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
    const events = await db("EventDetails")
      .leftJoin("EventTemplates", "EventDetails.EventTemplateID", "EventTemplates.EventTemplateID")
      .select(
        "EventDetails.EventDetailsID",
        "EventDetails.EventName",
        "EventDetails.EventDateStart",
        "EventDetails.EventLocation",
        "EventTemplates.EventType",
        "EventTemplates.EventDescription"
      )
      .orderBy("EventDetails.EventDateStart", "asc");

    const mappedEvents = events.map((e) => ({
      EventDetailsID: e.EventDetailsID,
      EventName: e.EventName,
      EventDateStartFormatted: formatDate(e.EventDateStart),
      EventLocation: e.EventLocation,
      EventType: e.EventType || "Event",
      EventDescriptionShort: e.EventDescription
        ? e.EventDescription.slice(0, 140) + (e.EventDescription.length > 140 ? "…" : "")
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
  // Donate is visually separate, but we still consider nav context
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
