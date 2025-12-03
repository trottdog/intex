// routes/myJourneyRoutes.js
//
// My Journey routes for participant-facing dashboard.
//

const express = require("express");
const router = express.Router();

/**
 * Very simple auth guard.
 * If you already have your own requireAuth middleware,
 * you can delete this function and instead:
 *
 *   const { requireAuth } = require("../middleware/auth");
 *   router.use(requireAuth);
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    // Adjust this redirect if your login route is different
    return res.redirect("/login");
  }
  next();
}

// Apply auth to all My Journey routes
router.use(requireAuth);

/**
 * Helper to make sure views always get safe defaults
 * so EJS does not blow up on undefined.
 */
function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * GET /my-journey
 * GET /my-journey/overview
 *
 * Overview dashboard for the participant.
 */
async function renderOverview(req, res) {
  try {
    // TODO: Replace stubs with your real DB calls.
    const participant = {
      participant_first_name: req.session.user.first_name || "Friend",
      participant_last_name: req.session.user.last_name || "",
    };

    const upcomingEvents = []; // fill from registrations table
    const pastEvents = []; // fill from registrations table

    const milestoneSummary = {
      planned: 0,
      inProgress: 0,
      achieved: 0,
    };

    const pendingSurveyCount = 0;

    res.render("myJourney/overview", {
      pageTitle: "My Journey | Ella Rises",
      participant,
      upcomingEvents: ensureArray(upcomingEvents),
      pastEvents: ensureArray(pastEvents),
      pendingSurveyCount,
      milestoneSummary,
      sidebarActive: "overview",
    });
  } catch (err) {
    console.error("Error loading My Journey overview:", err);
    req.flash(
      "error",
      "We had trouble loading your journey overview. Please try again."
    );
    return res.redirect("/");
  }
}

router.get("/my-journey", renderOverview);
router.get("/my-journey/overview", renderOverview);

/**
 * GET /my-journey/events
 *
 * List of upcoming and past events for this participant.
 */
router.get("/my-journey/events", async (req, res) => {
  try {
    // TODO: Replace with real DB queries filtered by participant / user id.
    const participant = {
      participant_first_name: req.session.user.first_name || "Friend",
    };

    const upcomingEvents = []; // registrations in future
    const pastEvents = []; // registrations in past

    res.render("myJourney/events", {
      pageTitle: "My Events | Ella Rises",
      participant,
      upcomingEvents: ensureArray(upcomingEvents),
      pastEvents: ensureArray(pastEvents),
      sidebarActive: "events",
    });
  } catch (err) {
    console.error("Error loading My Journey events:", err);
    req.flash(
      "error",
      "We had trouble loading your events. Please try again."
    );
    return res.redirect("/my-journey");
  }
});

/**
 * GET /my-journey/events/:registrationId
 *
 * Detail view for a single registration / event for this participant.
 */
router.get("/my-journey/events/:registrationId", async (req, res) => {
  const { registrationId } = req.params;

  try {
    // TODO: Replace with real DB query joining registration + event + survey + carpool
    const registration = {
      registration_id: registrationId,
      event_name: "Ella Rises Sample Event",
      event_type: "Workshop",
      event_date_start_formatted: "Jan 1, 2025",
      event_time_start_formatted: "",
      event_location: "Provo, UT",
      registration_status: "Registered",
      registration_check_in_date_formatted: "",
      registration_check_in_time_formatted: "",
      survey_status: "pending", // or "completed"
      can_complete_survey: false,
      survey_overall_score: null,
    };

    const carpoolAssignments = []; // [{...}] from carpool tables if you have them

    res.render("myJourney/event-detail-user", {
      pageTitle: "Event Details | Ella Rises",
      registration,
      carpoolAssignments: ensureArray(carpoolAssignments),
      sidebarActive: "events",
    });
  } catch (err) {
    console.error("Error loading event detail for My Journey:", err);
    req.flash(
      "error",
      "We had trouble loading that event. Please try again."
    );
    return res.redirect("/my-journey/events");
  }
});

/**
 * GET /my-journey/milestones
 *
 * Participant milestone board.
 */
router.get("/my-journey/milestones", async (req, res) => {
  try {
    // TODO: Replace with real DB query from participant_milestone / milestone_template
    const participant = {
      participant_first_name: req.session.user.first_name || "Friend",
    };

    const milestonesPlanned = [];
    const milestonesInProgress = [];
    const milestonesAchieved = [];

    res.render("myJourney/milestones", {
      pageTitle: "My Milestones | Ella Rises",
      participant,
      milestonesPlanned: ensureArray(milestonesPlanned),
      milestonesInProgress: ensureArray(milestonesInProgress),
      milestonesAchieved: ensureArray(milestonesAchieved),
      sidebarActive: "milestones",
    });
  } catch (err) {
    console.error("Error loading My Journey milestones:", err);
    req.flash(
      "error",
      "We had trouble loading your milestones. Please try again."
    );
    return res.redirect("/my-journey");
  }
});

/**
 * GET /my-journey/surveys
 *
 * List of pending and completed surveys.
 */
router.get("/my-journey/surveys", async (req, res) => {
  try {
    // TODO: Replace with real DB query linking registrations + post_event_survey
    const pendingSurveys = [];
    const completedSurveys = [];

    res.render("myJourney/surveys", {
      pageTitle: "My Surveys | Ella Rises",
      pendingSurveys: ensureArray(pendingSurveys),
      completedSurveys: ensureArray(completedSurveys),
      sidebarActive: "surveys",
    });
  } catch (err) {
    console.error("Error loading My Journey surveys:", err);
    req.flash(
      "error",
      "We had trouble loading your surveys. Please try again."
    );
    return res.redirect("/my-journey");
  }
});

/**
 * GET /my-journey/surveys/:registrationId
 *
 * Survey form for a single event (you can swap the view name with your actual form view).
 */
router.get("/my-journey/surveys/:registrationId", async (req, res) => {
  const { registrationId } = req.params;

  try {
    // TODO: Load registration + event info to show context for the survey
    res.render("myJourney/survey-form", {
      pageTitle: "Event Survey | Ella Rises",
      registrationId,
      sidebarActive: "surveys",
    });
  } catch (err) {
    console.error("Error loading survey form:", err);
    req.flash(
      "error",
      "We had trouble loading that survey. Please try again."
    );
    return res.redirect("/my-journey/surveys");
  }
});

/**
 * GET /my-journey/photos
 *
 * Photo gallery for this participant.
 */
router.get("/my-journey/photos", async (req, res) => {
  try {
    // TODO: Replace with real DB query from photo + photo_tag tables
    const taggedPhotos = [];

    res.render("myJourney/my-photos", {
      pageTitle: "My Photos | Ella Rises",
      taggedPhotos: ensureArray(taggedPhotos),
      sidebarActive: "photos",
    });
  } catch (err) {
    console.error("Error loading My Journey photos:", err);
    req.flash(
      "error",
      "We had trouble loading your photos. Please try again."
    );
    return res.redirect("/my-journey");
  }
});

/**
 * GET /my-journey/account
 *
 * Account / profile info for participant.
 */
router.get("/my-journey/account", async (req, res) => {
  try {
    // TODO: Replace with real DB query from participant_info + user table
    const participant = {
      participant_first_name: req.session.user.first_name || "Friend",
      participant_last_name: req.session.user.last_name || "",
      participant_city: "",
      participant_state: "",
      participant_phone: "",
      participant_school_or_employer: "",
      participant_field_of_interest: "",
      participant_role: "Participant",
    };

    const user = {
      email: req.session.user.email,
    };

    res.render("myJourney/account", {
      pageTitle: "My Account | Ella Rises",
      participant,
      user,
      sidebarActive: "account",
    });
  } catch (err) {
    console.error("Error loading My Journey account:", err);
    req.flash(
      "error",
      "We had trouble loading your account. Please try again."
    );
    return res.redirect("/my-journey");
  }
});

module.exports = router;
