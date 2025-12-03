/**
 * Event Routes
 * Handles public event listing and detail pages
 */

const express = require('express');
const router = express.Router();

// Helper function to ensure arrays
function ensureArray(val) {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  return [val];
}

/**
 * GET /events
 * Public events listing page
 */
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const selectedType = req.query.type || '';
    
    let events = [];
    let eventTypes = [];
    
    if (db) {
      // Build query for events
      let query = db('event_details as ed')
        .leftJoin('event_templates as et', 'ed.event_template_id', 'et.event_template_id')
        .select(
          'ed.event_details_id',
          'ed.event_name',
          'et.event_type',
          'ed.event_location',
          'et.event_description as event_description_short',
          'ed.event_capacity',
          db.raw("TO_CHAR(ed.event_date_time_start, 'Mon') as event_month"),
          db.raw("TO_CHAR(ed.event_date_time_start, 'DD') as event_day"),
          db.raw("TO_CHAR(ed.event_date_time_start, 'HH:MI AM') as event_time_start_formatted"),
          db.raw("ed.event_capacity - COALESCE((SELECT COUNT(*) FROM registration_info r WHERE r.event_name = ed.event_name AND r.event_date_time_start = ed.event_date_time_start AND r.registration_status = 'Registered'), 0) as spots_remaining")
        )
        .where('ed.event_date_time_start', '>=', new Date())
        .orderBy('ed.event_date_time_start', 'asc');
      
      // Apply type filter
      if (selectedType) {
        query = query.where('et.event_type', selectedType);
      }
      
      events = await query;
      events = ensureArray(events);
      
      // Truncate descriptions
      events = events.map(e => ({
        ...e,
        event_description_short: e.event_description_short 
          ? e.event_description_short.substring(0, 150) + (e.event_description_short.length > 150 ? '...' : '')
          : null
      }));
      
      // Get distinct event types
      const typesResult = await db('event_templates')
        .distinct('event_type')
        .whereNotNull('event_type')
        .orderBy('event_type');
      
      eventTypes = typesResult.map(t => t.event_type);
    }
    
    res.render('public/events-list', {
      pageTitle: 'Events',
      pageDescription: 'Discover upcoming Ella Rises events including workshops, performances, summits, and more.',
      events,
      eventTypes,
      selectedType,
      activeNav: 'events'
    });
  } catch (err) {
    console.error('Error loading events:', err);
    req.flash('error', 'Unable to load events. Please try again.');
    res.redirect('/');
  }
});

/**
 * GET /events/:id
 * Public event detail page
 */
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const eventId = req.params.id;
    
    let event = {};
    let relatedEvents = [];
    
    if (db) {
      // Get event details
      event = await db('event_details as ed')
        .leftJoin('event_templates as et', 'ed.event_template_id', 'et.event_template_id')
        .select(
          'ed.*',
          'et.event_type',
          'et.event_description',
          'et.event_recurrence_pattern',
          db.raw("TO_CHAR(ed.event_date_time_start, 'MMMM DD, YYYY') as event_date_start_formatted"),
          db.raw("TO_CHAR(ed.event_date_time_start, 'HH:MI AM') as event_time_start_formatted"),
          db.raw("TO_CHAR(ed.event_date_time_end, 'HH:MI AM') as event_time_end_formatted"),
          db.raw("CASE WHEN ed.event_date_time_start < NOW() THEN true ELSE false END as is_past"),
          db.raw("ed.event_capacity - COALESCE((SELECT COUNT(*) FROM registration_info r WHERE r.event_name = ed.event_name AND r.event_date_time_start = ed.event_date_time_start AND r.registration_status = 'Registered'), 0) as spots_remaining")
        )
        .where('ed.event_details_id', eventId)
        .first();
      
      if (!event) {
        req.flash('error', 'Event not found.');
        return res.redirect('/events');
      }
      
      // Get related events (same type, different event)
      const relatedResult = await db('event_details as ed')
        .leftJoin('event_templates as et', 'ed.event_template_id', 'et.event_template_id')
        .select(
          'ed.event_details_id',
          'ed.event_name',
          'et.event_type',
          db.raw("TO_CHAR(ed.event_date_time_start, 'Mon') as event_month"),
          db.raw("TO_CHAR(ed.event_date_time_start, 'DD') as event_day")
        )
        .where('et.event_type', event.event_type)
        .where('ed.event_details_id', '!=', eventId)
        .where('ed.event_date_time_start', '>=', new Date())
        .orderBy('ed.event_date_time_start', 'asc')
        .limit(3);
      
      relatedEvents = ensureArray(relatedResult);
    }
    
    res.render('public/event-detail', {
      pageTitle: event.event_name || 'Event Details',
      pageDescription: event.event_description ? event.event_description.substring(0, 160) : 'Join us for this Ella Rises event.',
      event,
      relatedEvents,
      activeNav: 'events',
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (err) {
    console.error('Error loading event detail:', err);
    req.flash('error', 'Unable to load event details. Please try again.');
    res.redirect('/events');
  }
});

/**
 * POST /events/:id/register
 * Register for an event
 */
router.post('/:id/register', async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session || !req.session.user) {
      req.flash('error', 'Please log in to register for events.');
      return res.redirect('/login?redirect=/events/' + req.params.id);
    }
    
    const db = req.app.get('db');
    const eventId = req.params.id;
    const userEmail = req.session.user.email;
    
    if (db) {
      // Get event info
      const event = await db('event_details')
        .where('event_details_id', eventId)
        .first();
      
      if (!event) {
        req.flash('error', 'Event not found.');
        return res.redirect('/events');
      }
      
      // Check if already registered
      const existing = await db('registration_info')
        .where({
          participant_email: userEmail,
          event_name: event.event_name,
          event_date_time_start: event.event_date_time_start
        })
        .first();
      
      if (existing) {
        req.flash('info', 'You are already registered for this event.');
        return res.redirect('/my-journey/events');
      }
      
      // Create registration
      await db('registration_info').insert({
        participant_email: userEmail,
        event_name: event.event_name,
        event_date_time_start: event.event_date_time_start,
        registration_status: 'Registered',
        created_at: new Date()
      });
      
      req.flash('success', 'Successfully registered for ' + event.event_name + '!');
      res.redirect('/my-journey/events');
    } else {
      req.flash('error', 'Unable to complete registration. Please try again.');
      res.redirect('/events/' + eventId);
    }
  } catch (err) {
    console.error('Error registering for event:', err);
    req.flash('error', 'Unable to complete registration. Please try again.');
    res.redirect('/events/' + req.params.id);
  }
});

module.exports = router;
