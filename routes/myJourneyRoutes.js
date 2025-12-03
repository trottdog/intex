// routes/myJourneyRoutes.js
const express = require("express");
const db = require("../config/db");

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    req.flash("error", "Please log in to view your journey.");
    return res.redirect("/login");
  }
  return next();
}

function isUpcoming(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const eventMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return eventMidnight >= todayMidnight;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// GET /my-journey – overview for participant
router.get("/my-journey", requireAuth, async (req, res) => {
  req.activeNav = "my-journey";
  res.locals.activeNav = "my-journey";

  const { participantId, email } = req.session.user;

  try {
    // 1) Get participant profile
    let participant = null;

    if (participantId) {
      participant = await db("participant_info")
        .where({ participant_id: participantId })
        .first();
    }

    if (!participant) {
      participant = await db("participant_info")
        .where({ participant_email: email })
        .first();
    }

    if (!participant) {
      req.flash("error", "We could not find your participant profile.");
      return res.redirect("/login");
    }

    const participantEmail = participant.participant_email;

    // 2) Registrations for this participant
    const registrations = await db("registration_info as r")
      .leftJoin("attendance_report as a", "r.registration_status_id", "a.registration_status_id")
      .select(
        "r.registration_id",
        "r.event_name",
        "r.event_date_start",
        "r.event_location",
        "r.registration_status_id",
        "a.registration_status",
        "a.registration_attended_flag",
        "r.survey_submission_date",
        "r.survey_overall_score"
      )
      .where("r.participant_email", participantEmail)
      .orderBy("r.event_date_start", "desc");

    const upcomingEvents = [];
    const pastEvents = [];
    let pendingSurveyCount = 0;

    registrations.forEach((r) => {
      const event = {
        registration_id: r.registration_id,
        event_name: r.event_name,
        event_date_start: r.event_date_start,
        event_date_start_formatted: formatDate(r.event_date_start),
        event_location: r.event_location,
        registration_status: r.registration_status,
        attended_flag: r.registration_attended_flag,
        survey_submission_date: r.survey_submission_date,
        survey_overall_score: r.survey_overall_score,
      };

      if (isUpcoming(r.event_date_start)) {
        upcomingEvents.push(event);
      } else {
        pastEvents.push(event);
      }

      if (r.registration_attended_flag && !r.survey_submission_date) {
        pendingSurveyCount += 1;
      }
    });

    const upcomingEventsPreview = upcomingEvents
      .sort((a, b) => new Date(a.event_date_start) - new Date(b.event_date_start))
      .slice(0, 4);

    const pastEventsPreview = pastEvents.slice(0, 5);

    // 3) Milestones summary
    const milestones = await db("participant_milestone as pm")
      .leftJoin(
        "milestone_template as mt",
        "pm.milestone_template_id",
        "mt.milestone_template_id"
      )
      .select(
        "pm.participant_milestone_id",
        "pm.status",
        "pm.planned_date",
        "pm.achieved_date",
        "mt.title",
        "mt.category",
        "mt.icon_name"
      )
      .where("pm.participant_id", participant.participant_id)
      .orderBy("pm.created_at", "desc");

    let milestonesPlanned = 0;
    let milestonesInProgress = 0;
    let milestonesAchieved = 0;

    milestones.forEach((m) => {
      if (m.status === "planned") milestonesPlanned += 1;
      if (m.status === "in_progress") milestonesInProgress += 1;
      if (m.status === "achieved") milestonesAchieved += 1;
    });

    const milestoneSummary = {
      total: milestones.length,
      planned: milestonesPlanned,
      inProgress: milestonesInProgress,
      achieved: milestonesAchieved,
    };

    return res.render("myJourney/overview", {
      pageTitle: "My Journey | Ella Rises",
      participant,
      upcomingEvents: upcomingEventsPreview,
      pastEvents: pastEventsPreview,
      pendingSurveyCount,
      milestoneSummary,
      sidebarActive: "overview",
    });
  } catch (err) {
    console.error("Error loading My Journey:", err);
    req.flash("error", "We had trouble loading your journey. Please try again.");
    return res.redirect("/");
  }
});

module.exports = router;
