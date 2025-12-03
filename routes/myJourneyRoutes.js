/**
 * My Journey Routes
 * Handles all participant-facing routes for the My Journey section
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Helper function to ensure arrays
function ensureArray(val) {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  return [val];
}

// Auth middleware - ensure user is logged in
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    req.flash('error', 'Please log in to access My Journey.');
    return res.redirect('/login');
  }
  next();
}

// Apply auth middleware to all routes
router.use(requireAuth);

// Middleware to load participant data
router.use(async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const userId = req.session.user.user_id;
    
    // Load participant info linked to user
    let participant = null;
    if (db) {
      participant = await db('participant_info')
        .where('user_id', userId)
        .first();
    }
    
    // If no participant record, use user info
    if (!participant) {
      participant = {
        participant_first_name: req.session.user.first_name || '',
        participant_last_name: req.session.user.last_name || '',
        participant_email: req.session.user.email || ''
      };
    }
    
    res.locals.currentParticipant = participant;
    res.locals.currentUser = req.session.user;
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    res.locals.layout = 'myJourney/myJourney';
    res.locals.activeNav = 'my-journey';

    // ✅ Provide safe default data for My Journey views
    res.locals.upcomingEvents = res.locals.upcomingEvents || [];
    res.locals.recentAchievements = res.locals.recentAchievements || [];
    res.locals.pendingSurveys = res.locals.pendingSurveys || [];
    res.locals.milestoneSummary = res.locals.milestoneSummary || { planned: 0, inProgress: 0, achieved: 0 };
    res.locals.eventsSummary = res.locals.eventsSummary || { upcoming: 0, attended: 0, total: 0 };

    res.locals.pendingSurveyCount = typeof res.locals.pendingSurveyCount === 'number' ? res.locals.pendingSurveyCount : 0;
    res.locals.upcomingEventCount = typeof res.locals.upcomingEventCount === 'number' ? res.locals.upcomingEventCount : 0;
    
    next();
  } catch (err) {
    console.error('Error loading participant data:', err);
    next();
  }
});


/**
 * GET /my-journey
 * Dashboard overview
 */
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const participant = res.locals.currentParticipant;
    const participantEmail = participant.participant_email;
    
    // Initialize data
    let upcomingEvents = [];
    let recentAchievements = [];
    let pendingSurveys = [];
    let milestoneSummary = { planned: 0, inProgress: 0, achieved: 0 };
    let eventsSummary = { upcoming: 0, attended: 0, total: 0 };
    
    if (db && participantEmail) {
      // Get upcoming events
      const upcomingResult = await db('registration_info as r')
        .leftJoin('event_details as ed', function() {
          this.on('r.event_name', '=', 'ed.event_name')
            .andOn('r.event_date_time_start', '=', 'ed.event_date_time_start');
        })
        .leftJoin('event_templates as et', 'ed.event_template_id', 'et.event_template_id')
        .select(
          'r.registration_id',
          'r.event_name',
          'ed.event_details_id',
          'et.event_type',
          'ed.event_location',
          db.raw("TO_CHAR(ed.event_date_time_start, 'Mon') as event_month"),
          db.raw("TO_CHAR(ed.event_date_time_start, 'DD') as event_day"),
          db.raw("TO_CHAR(ed.event_date_time_start, 'HH:MI AM') as event_time_start_formatted"),
          'r.registration_status'
        )
        .where('r.participant_email', participantEmail)
        .where('ed.event_date_time_start', '>=', new Date())
        .orderBy('ed.event_date_time_start', 'asc')
        .limit(5);
      
      upcomingEvents = ensureArray(upcomingResult);
      
      // Get milestone summary
      if (participant.participant_id) {
        const milestones = await db('participant_milestone')
          .where('participant_id', participant.participant_id)
          .select('status');
        
        milestones.forEach(m => {
          if (m.status === 'planned') milestoneSummary.planned++;
          else if (m.status === 'in_progress') milestoneSummary.inProgress++;
          else if (m.status === 'achieved') milestoneSummary.achieved++;
        });
        
        // Get recent achievements
        const achievementsResult = await db('participant_milestone as pm')
          .leftJoin('milestone_template as mt', 'pm.milestone_template_id', 'mt.milestone_template_id')
          .select(
            'pm.participant_milestone_id',
            'mt.title as milestone_title',
            db.raw("TO_CHAR(pm.achieved_date, 'Mon DD, YYYY') as achieved_date_formatted")
          )
          .where('pm.participant_id', participant.participant_id)
          .where('pm.status', 'achieved')
          .orderBy('pm.achieved_date', 'desc')
          .limit(3);
        
        recentAchievements = ensureArray(achievementsResult);
      }
      
      // Get pending surveys
      const pendingResult = await db('registration_info as r')
        .leftJoin('event_details as ed', function() {
          this.on('r.event_name', '=', 'ed.event_name')
            .andOn('r.event_date_time_start', '=', 'ed.event_date_time_start');
        })
        .select(
          'r.registration_id',
          'r.event_name',
          db.raw("TO_CHAR(ed.event_date_time_start, 'Mon DD, YYYY') as event_date_formatted")
        )
        .where('r.participant_email', participantEmail)
        .where('ed.event_date_time_start', '<', new Date())
        .whereNull('r.survey_overall_score')
        .limit(5);
      
      pendingSurveys = ensureArray(pendingResult);
      
      // Get events summary
      const attendedCount = await db('registration_info')
        .where('participant_email', participantEmail)
        .whereNotNull('registration_check_in_date')
        .count('* as count')
        .first();
      
      eventsSummary.attended = attendedCount ? parseInt(attendedCount.count) : 0;
      eventsSummary.upcoming = upcomingEvents.length;
      eventsSummary.total = eventsSummary.attended + eventsSummary.upcoming;
    }
    
    res.render('myJourney/overview', {
      pageTitle: 'My Journey',
      sidebarActive: 'overview',
      upcomingEvents,
      recentAchievements,
      pendingSurveys,
      milestoneSummary,
      eventsSummary,
      pendingSurveyCount: pendingSurveys.length,
      upcomingEventCount: upcomingEvents.length
    });
  } catch (err) {
    console.error('Error loading My Journey overview:', err);
    req.flash('error', 'Unable to load your dashboard. Please try again.');
    res.redirect('/');
  }
});

/**
 * GET /my-journey/events
 * List of upcoming and past events
 */
router.get('/events', async (req, res) => {
  try {
    const db = req.app.get('db');
    const participant = res.locals.currentParticipant;
    const participantEmail = participant.participant_email;
    const activeTab = req.query.tab || 'upcoming';
    
    let upcomingEvents = [];
    let pastEvents = [];
    
    if (db && participantEmail) {
      // Get upcoming events
      const upcomingResult = await db('registration_info as r')
        .leftJoin('event_details as ed', function() {
          this.on('r.event_name', '=', 'ed.event_name')
            .andOn('r.event_date_time_start', '=', 'ed.event_date_time_start');
        })
        .leftJoin('event_templates as et', 'ed.event_template_id', 'et.event_template_id')
        .select(
          'r.registration_id',
          'r.event_name',
          'ed.event_details_id',
          'et.event_type',
          'ed.event_location',
          'ed.event_description as event_description_short',
          db.raw("TO_CHAR(ed.event_date_time_start, 'Mon DD, YYYY') as event_date_start_formatted"),
          db.raw("TO_CHAR(ed.event_date_time_start, 'HH:MI AM') as event_time_start_formatted"),
          'r.registration_status'
        )
        .where('r.participant_email', participantEmail)
        .where('ed.event_date_time_start', '>=', new Date())
        .orderBy('ed.event_date_time_start', 'asc');
      
      upcomingEvents = ensureArray(upcomingResult);
      
      // Get past events
      const pastResult = await db('registration_info as r')
        .leftJoin('event_details as ed', function() {
          this.on('r.event_name', '=', 'ed.event_name')
            .andOn('r.event_date_time_start', '=', 'ed.event_date_time_start');
        })
        .leftJoin('event_templates as et', 'ed.event_template_id', 'et.event_template_id')
        .select(
          'r.registration_id',
          'r.event_name',
          'ed.event_details_id',
          'et.event_type',
          'ed.event_location',
          db.raw("TO_CHAR(ed.event_date_time_start, 'Mon') as event_month"),
          db.raw("TO_CHAR(ed.event_date_time_start, 'DD') as event_day"),
          db.raw("EXTRACT(YEAR FROM ed.event_date_time_start) as event_year"),
          db.raw("CASE WHEN r.registration_check_in_date IS NOT NULL THEN 'attended' ELSE 'unknown' END as attendance_status"),
          db.raw("CASE WHEN r.survey_overall_score IS NOT NULL THEN 'completed' ELSE 'pending' END as survey_status"),
          db.raw("CASE WHEN r.survey_overall_score IS NULL AND ed.event_date_time_start < NOW() THEN true ELSE false END as can_take_survey")
        )
        .where('r.participant_email', participantEmail)
        .where('ed.event_date_time_start', '<', new Date())
        .orderBy('ed.event_date_time_start', 'desc');
      
      pastEvents = ensureArray(pastResult);
    }
    
    res.render('myJourney/events', {
      pageTitle: 'My Events',
      sidebarActive: 'events',
      upcomingEvents,
      pastEvents,
      activeTab,
      upcomingEventCount: upcomingEvents.length
    });
  } catch (err) {
    console.error('Error loading My Journey events:', err);
    req.flash('error', 'Unable to load your events. Please try again.');
    res.redirect('/my-journey');
  }
});

/**
 * GET /my-journey/events/:id
 * Event detail view
 */
router.get('/events/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const registrationId = req.params.id;
    const participant = res.locals.currentParticipant;
    
    let registration = {};
    let carpoolAssignments = [];
    
    if (db) {
      // Get registration details
      const regResult = await db('registration_info as r')
        .leftJoin('event_details as ed', function() {
          this.on('r.event_name', '=', 'ed.event_name')
            .andOn('r.event_date_time_start', '=', 'ed.event_date_time_start');
        })
        .leftJoin('event_templates as et', 'ed.event_template_id', 'et.event_template_id')
        .select(
          'r.*',
          'ed.event_details_id',
          'et.event_type',
          'et.event_description',
          'ed.event_location',
          db.raw("TO_CHAR(ed.event_date_time_start, 'Mon DD, YYYY') as event_date_start_formatted"),
          db.raw("TO_CHAR(ed.event_date_time_start, 'HH:MI AM') as event_time_start_formatted"),
          db.raw("TO_CHAR(r.registration_check_in_date, 'Mon DD, YYYY') as registration_check_in_date_formatted"),
          db.raw("TO_CHAR(r.registration_check_in_time, 'HH:MI AM') as registration_check_in_time_formatted"),
          db.raw("CASE WHEN ed.event_date_time_start >= NOW() THEN true ELSE false END as is_upcoming"),
          db.raw("CASE WHEN r.survey_overall_score IS NOT NULL THEN 'completed' WHEN ed.event_date_time_start < NOW() THEN 'available' ELSE 'unavailable' END as survey_status"),
          db.raw("CASE WHEN r.survey_overall_score IS NULL AND ed.event_date_time_start < NOW() THEN true ELSE false END as can_complete_survey"),
          'r.survey_overall_score'
        )
        .where('r.registration_id', registrationId)
        .first();
      
      if (regResult) {
        registration = regResult;
        
        // Get carpool assignments if participant exists
        if (participant.participant_id) {
          const carpoolResult = await db('carpool_assignment as ca')
            .leftJoin('carpool_group as cg', 'ca.carpool_group_id', 'cg.carpool_group_id')
            .select(
              'ca.*',
              'cg.departure_location',
              db.raw("TO_CHAR(cg.departure_time, 'HH:MI AM') as departure_time_formatted"),
              'cg.notes'
            )
            .where('ca.participant_id', participant.participant_id)
            .where('cg.event_details_id', registration.event_details_id);
          
          carpoolAssignments = ensureArray(carpoolResult);
        }
      }
    }
    
    if (!registration.registration_id) {
      req.flash('error', 'Event registration not found.');
      return res.redirect('/my-journey/events');
    }
    
    res.render('myJourney/event-detail-user', {
      pageTitle: registration.event_name || 'Event Details',
      sidebarActive: 'events',
      registration,
      carpoolAssignments
    });
  } catch (err) {
    console.error('Error loading event detail:', err);
    req.flash('error', 'Unable to load event details. Please try again.');
    res.redirect('/my-journey/events');
  }
});

/**
 * POST /my-journey/events/:id/cancel
 * Cancel event registration
 */
router.post('/events/:id/cancel', async (req, res) => {
  try {
    const db = req.app.get('db');
    const registrationId = req.params.id;
    
    if (db) {
      await db('registration_info')
        .where('registration_id', registrationId)
        .update({ registration_status: 'Cancelled' });
    }
    
    req.flash('success', 'Your registration has been cancelled.');
    res.redirect('/my-journey/events');
  } catch (err) {
    console.error('Error cancelling registration:', err);
    req.flash('error', 'Unable to cancel registration. Please try again.');
    res.redirect('/my-journey/events');
  }
});

/**
 * GET /my-journey/milestones
 * Milestones board
 */
router.get('/milestones', async (req, res) => {
  try {
    const db = req.app.get('db');
    const participant = res.locals.currentParticipant;
    
    let milestonesPlanned = [];
    let milestonesInProgress = [];
    let milestonesAchieved = [];
    let availableTemplates = [];
    
    if (db && participant.participant_id) {
      // Get milestones by status
      const milestones = await db('participant_milestone as pm')
        .leftJoin('milestone_template as mt', 'pm.milestone_template_id', 'mt.milestone_template_id')
        .select(
          'pm.*',
          'mt.title as milestone_title',
          'mt.description as milestone_description',
          'mt.category as milestone_category',
          db.raw("TO_CHAR(pm.target_date, 'Mon DD, YYYY') as target_date_formatted"),
          db.raw("TO_CHAR(pm.achieved_date, 'Mon DD, YYYY') as achieved_date_formatted")
        )
        .where('pm.participant_id', participant.participant_id)
        .orderBy('pm.created_at', 'desc');
      
      milestones.forEach(m => {
        if (m.status === 'planned') milestonesPlanned.push(m);
        else if (m.status === 'in_progress') milestonesInProgress.push(m);
        else if (m.status === 'achieved') milestonesAchieved.push(m);
      });
      
      // Get available templates
      const templates = await db('milestone_template')
        .select('*')
        .orderBy('category')
        .orderBy('title');
      
      availableTemplates = ensureArray(templates);
    }
    
    res.render('myJourney/milestones', {
      pageTitle: 'My Milestones',
      sidebarActive: 'milestones',
      milestonesPlanned,
      milestonesInProgress,
      milestonesAchieved,
      availableTemplates
    });
  } catch (err) {
    console.error('Error loading milestones:', err);
    req.flash('error', 'Unable to load your milestones. Please try again.');
    res.redirect('/my-journey');
  }
});

/**
 * POST /my-journey/milestones
 * Add new milestone
 */
router.post('/milestones', async (req, res) => {
  try {
    const db = req.app.get('db');
    const participant = res.locals.currentParticipant;
    const { milestone_template_id, custom_title, target_date, notes } = req.body;
    
    if (db && participant.participant_id) {
      const newMilestone = {
        participant_id: participant.participant_id,
        status: 'planned',
        notes,
        created_at: new Date()
      };
      
      if (target_date) {
        newMilestone.target_date = target_date;
      }
      
      if (milestone_template_id && milestone_template_id !== 'custom') {
        newMilestone.milestone_template_id = milestone_template_id;
      }
      
      await db('participant_milestone').insert(newMilestone);
      req.flash('success', 'Milestone added successfully!');
    }
    
    res.redirect('/my-journey/milestones');
  } catch (err) {
    console.error('Error adding milestone:', err);
    req.flash('error', 'Unable to add milestone. Please try again.');
    res.redirect('/my-journey/milestones');
  }
});

/**
 * POST /my-journey/milestones/:id/start
 * Start progress on a milestone
 */
router.post('/milestones/:id/start', async (req, res) => {
  try {
    const db = req.app.get('db');
    const milestoneId = req.params.id;
    
    if (db) {
      await db('participant_milestone')
        .where('participant_milestone_id', milestoneId)
        .update({ 
          status: 'in_progress',
          started_date: new Date()
        });
    }
    
    req.flash('success', 'Good luck! You\'ve started working on this milestone.');
    res.redirect('/my-journey/milestones');
  } catch (err) {
    console.error('Error starting milestone:', err);
    req.flash('error', 'Unable to update milestone. Please try again.');
    res.redirect('/my-journey/milestones');
  }
});

/**
 * POST /my-journey/milestones/:id/achieve
 * Mark milestone as achieved
 */
router.post('/milestones/:id/achieve', async (req, res) => {
  try {
    const db = req.app.get('db');
    const milestoneId = req.params.id;
    
    if (db) {
      await db('participant_milestone')
        .where('participant_milestone_id', milestoneId)
        .update({ 
          status: 'achieved',
          achieved_date: new Date()
        });
    }
    
    req.flash('success', '🎉 Congratulations! You achieved this milestone!');
    res.redirect('/my-journey/milestones');
  } catch (err) {
    console.error('Error achieving milestone:', err);
    req.flash('error', 'Unable to update milestone. Please try again.');
    res.redirect('/my-journey/milestones');
  }
});

/**
 * POST /my-journey/milestones/:id/progress
 * Add progress note to milestone
 */
router.post('/milestones/:id/progress', async (req, res) => {
  try {
    const db = req.app.get('db');
    const milestoneId = req.params.id;
    const { notes } = req.body;
    
    if (db) {
      await db('participant_milestone')
        .where('participant_milestone_id', milestoneId)
        .update({ notes });
    }
    
    req.flash('success', 'Progress note saved!');
    res.redirect('/my-journey/milestones');
  } catch (err) {
    console.error('Error saving progress note:', err);
    req.flash('error', 'Unable to save note. Please try again.');
    res.redirect('/my-journey/milestones');
  }
});

/**
 * GET /my-journey/surveys
 * Surveys list
 */
router.get('/surveys', async (req, res) => {
  try {
    const db = req.app.get('db');
    const participant = res.locals.currentParticipant;
    const participantEmail = participant.participant_email;
    
    let pendingSurveys = [];
    let completedSurveys = [];
    
    if (db && participantEmail) {
      // Get pending surveys
      const pendingResult = await db('registration_info as r')
        .leftJoin('event_details as ed', function() {
          this.on('r.event_name', '=', 'ed.event_name')
            .andOn('r.event_date_time_start', '=', 'ed.event_date_time_start');
        })
        .leftJoin('event_templates as et', 'ed.event_template_id', 'et.event_template_id')
        .select(
          'r.registration_id',
          'r.event_name',
          'et.event_type',
          db.raw("TO_CHAR(ed.event_date_time_start, 'Mon DD, YYYY') as event_date_formatted")
        )
        .where('r.participant_email', participantEmail)
        .where('ed.event_date_time_start', '<', new Date())
        .whereNull('r.survey_overall_score')
        .orderBy('ed.event_date_time_start', 'desc');
      
      pendingSurveys = ensureArray(pendingResult);
      
      // Get completed surveys
      const completedResult = await db('registration_info as r')
        .leftJoin('event_details as ed', function() {
          this.on('r.event_name', '=', 'ed.event_name')
            .andOn('r.event_date_time_start', '=', 'ed.event_date_time_start');
        })
        .leftJoin('event_templates as et', 'ed.event_template_id', 'et.event_template_id')
        .select(
          'r.registration_id',
          'r.event_name',
          'et.event_type',
          'r.survey_overall_score as overall_score',
          db.raw("TO_CHAR(ed.event_date_time_start, 'Mon DD, YYYY') as event_date_formatted")
        )
        .where('r.participant_email', participantEmail)
        .whereNotNull('r.survey_overall_score')
        .orderBy('ed.event_date_time_start', 'desc');
      
      completedSurveys = ensureArray(completedResult);
    }
    
    res.render('myJourney/surveys', {
      pageTitle: 'My Surveys',
      sidebarActive: 'surveys',
      pendingSurveys,
      completedSurveys,
      pendingSurveyCount: pendingSurveys.length
    });
  } catch (err) {
    console.error('Error loading surveys:', err);
    req.flash('error', 'Unable to load your surveys. Please try again.');
    res.redirect('/my-journey');
  }
});

/**
 * GET /my-journey/surveys/:registrationId
 * Survey form
 */
router.get('/surveys/:registrationId', async (req, res) => {
  try {
    // TODO: Implement survey form
    req.flash('info', 'Survey functionality coming soon!');
    res.redirect('/my-journey/surveys');
  } catch (err) {
    console.error('Error loading survey form:', err);
    req.flash('error', 'Unable to load survey. Please try again.');
    res.redirect('/my-journey/surveys');
  }
});

/**
 * GET /my-journey/photos
 * Photo gallery
 */
router.get('/photos', async (req, res) => {
  try {
    const db = req.app.get('db');
    const participant = res.locals.currentParticipant;
    
    let taggedPhotos = [];
    
    if (db && participant.participant_id) {
      const photos = await db('photo_tag as pt')
        .leftJoin('photo as p', 'pt.photo_id', 'p.photo_id')
        .leftJoin('event_details as ed', 'p.event_details_id', 'ed.event_details_id')
        .select(
          'p.photo_id',
          'p.file_path',
          'ed.event_name',
          db.raw("TO_CHAR(p.uploaded_at, 'Mon DD, YYYY') as uploaded_date_formatted")
        )
        .where('pt.participant_id', participant.participant_id)
        .orderBy('p.uploaded_at', 'desc');
      
      taggedPhotos = ensureArray(photos);
    }
    
    res.render('myJourney/my-photos', {
      pageTitle: 'My Photos',
      sidebarActive: 'photos',
      taggedPhotos
    });
  } catch (err) {
    console.error('Error loading photos:', err);
    req.flash('error', 'Unable to load your photos. Please try again.');
    res.redirect('/my-journey');
  }
});

/**
 * GET /my-journey/account
 * Account settings
 */
router.get('/account', async (req, res) => {
  try {
    res.render('myJourney/account', {
      pageTitle: 'My Account',
      sidebarActive: 'account'
    });
  } catch (err) {
    console.error('Error loading account:', err);
    req.flash('error', 'Unable to load your account. Please try again.');
    res.redirect('/my-journey');
  }
});

/**
 * POST /my-journey/account
 * Update account settings
 */
router.post('/account', async (req, res) => {
  try {
    const db = req.app.get('db');
    const participant = res.locals.currentParticipant;
    const { action, first_name, last_name, email, phone, school, grade, birthdate } = req.body;
    
    if (action === 'update_profile' && db && participant.participant_id) {
      await db('participant_info')
        .where('participant_id', participant.participant_id)
        .update({
          participant_first_name: first_name,
          participant_last_name: last_name,
          participant_email: email,
          participant_phone: phone,
          participant_school: school,
          participant_grade: grade,
          participant_birthdate: birthdate || null
        });
      
      // Update session
      req.session.user.first_name = first_name;
      req.session.user.last_name = last_name;
      req.session.user.email = email;
      
      req.flash('success', 'Profile updated successfully!');
    } else if (action === 'change_password') {
      // TODO: Implement password change
      req.flash('info', 'Password change functionality coming soon!');
    } else if (action === 'update_preferences') {
      // TODO: Implement preferences
      req.flash('success', 'Preferences updated!');
    }
    
    res.redirect('/my-journey/account');
  } catch (err) {
    console.error('Error updating account:', err);
    req.flash('error', 'Unable to update your account. Please try again.');
    res.redirect('/my-journey/account');
  }
});

/**
 * POST /my-journey/account/photo
 * Upload profile or cover photo
 */
router.post('/account/photo', upload.single('photo'), async (req, res) => {
  try {
    const db = req.app.get('db');
    const participant = res.locals.currentParticipant;
    const { photo_type } = req.body;
    
    if (!req.file) {
      req.flash('error', 'Please select a photo to upload.');
      return res.redirect('/my-journey/account');
    }
    
    const photoPath = '/uploads/profiles/' + req.file.filename;
    
    if (db && participant.participant_id) {
      if (photo_type === 'profile') {
        await db('participant_info')
          .where('participant_id', participant.participant_id)
          .update({ profile_photo_path: photoPath });
      } else if (photo_type === 'cover') {
        await db('participant_info')
          .where('participant_id', participant.participant_id)
          .update({ cover_photo_path: photoPath });
      }
    }
    
    req.flash('success', 'Photo uploaded successfully!');
    res.redirect('/my-journey/account');
  } catch (err) {
    console.error('Error uploading photo:', err);
    req.flash('error', 'Unable to upload photo. Please try again.');
    res.redirect('/my-journey/account');
  }
});

module.exports = router;
