require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const flash = require('connect-flash');
const csrf = require('csurf');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig[process.env.NODE_ENV || 'development']);

const app = express();
const PORT = process.env.PORT || 8080; // Elastic Beanstalk will set PORT

// --------------------------------------
// 1. Basic Express and view engine setup
// --------------------------------------

// EJS views (you can change to Pug or something else if needed)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parse form data and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (global CSS, client JS, images)
// Example: /public/css/global.css for consistent styling and RWD
app.use(express.static(path.join(__dirname, 'public')));

// --------------------------------------
// 2. Security: Helmet
// --------------------------------------

// Basic Helmet setup
app.use(helmet());

// Optional: tighten or adjust CSP if needed for Chart.js, CDNs, etc
// app.use(
//   helmet.contentSecurityPolicy({
//     useDefaults: true,
//     directives: {
//       "script-src": ["'self'", "https://cdn.jsdelivr.net"],
//       "style-src": ["'self'", "'unsafe-inline'"],
//       "img-src": ["'self'", "data:", "https:"]
//     }
//   })
// );

// --------------------------------------
// 3. Sessions + Flash messages
// --------------------------------------

// In production you should use a real session store (Redis, Postgres, etc)
// For now this uses the default memory store, which is fine for development.
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true on HTTPS
      sameSite: 'lax'
    }
  })
);

// Flash messages (success, error, info)
app.use(flash());

// Make flash messages and auth state available in all views
app.use((req, res, next) => {
  res.locals.messages = {
    success: req.flash('success'),
    error: req.flash('error'),
    info: req.flash('info')
  };

  // Example auth flag for nav bar, etc
  res.locals.currentUser = req.user || null;

  next();
});

// --------------------------------------
// 4. CSRF protection
// --------------------------------------

const csrfProtection = csrf();

// Apply CSRF protection to routes that handle browser forms
// If you have pure JSON API routes, you can mount them before this middleware.
app.use(csrfProtection);

// Make CSRF token available in all EJS views as csrfToken
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// --------------------------------------
// 5. Knex (Postgres via RDS)
// --------------------------------------

// Attach knex to the request so routes can use req.db
app.use((req, res, next) => {
  req.db = knex;
  next();
});

// --------------------------------------
// 6. Multer configuration for photo uploads
// --------------------------------------

// Store uploads under public/uploads so they can be served as static files
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    // Simple unique filename: timestamp-originalname
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safeName);
  }
});

// Limit file size and types if needed for accessibility and safety
const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max, adjust as needed
  }
});

// You can export this or pass it into your routes module
app.locals.upload = upload;

// --------------------------------------
// 7. Nodemailer (email setup placeholder)
// --------------------------------------

// Configure a transporter. For development you might use Mailtrap.
// For production on EB, store these in environment variables.
const mailTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  secure: false, // true if port 465
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// Quick helper that routes can use as req.mailer
app.use((req, res, next) => {
  req.mailer = mailTransporter;
  next();
});

// --------------------------------------
// 8. JWT and bcrypt: helper middleware
// --------------------------------------

// Auth middleware example for protected routes
function authenticateToken(req, res, next) {
  // You can load from cookie or Authorization header
  const token = req.cookies?.token || (req.headers.authorization || '').replace('Bearer ', '');

  if (!token) {
    return res.redirect('/login');
  }

  jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret', (err, user) => {
    if (err) {
      req.flash('error', 'Session expired. Please log in again.');
      return res.redirect('/login');
    }
    req.user = user; // user payload from jwt.sign
    res.locals.currentUser = user;
    next();
  });
}

// Attach bcrypt to req if you want a consistent pattern
app.use((req, res, next) => {
  req.bcrypt = bcrypt;
  next();
});

// --------------------------------------
// 9. Routes
// --------------------------------------

// Example home route (RWD and ADA considerations are mostly in the EJS templates)
// Use proper landmarks, labels, alt text, high contrast, and viewport meta in your layout.
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Ella Rises',
    description: 'Home page for the Ella Rises web app'
  });
});

// Example: a protected dashboard route with charts, etc
app.get('/dashboard', authenticateToken, (req, res) => {
  // Query data with req.db (Knex), then pass to Chart.js via the view
  res.render('dashboard', {
    title: 'Dashboard',
    chartData: {} // fill with real data
  });
});

// Example: upload route using Multer
app.post('/upload-photo', authenticateToken, upload.single('photo'), (req, res) => {
  // Access file info: req.file
  // Save file path in Postgres via req.db if needed
  req.flash('success', 'Photo uploaded successfully.');
  res.redirect('/profile');
});

// TODO: plug in your auth routes, participant routes, event routes, etc
// const authRoutes = require('./routes/auth');
// app.use('/auth', authRoutes);

// --------------------------------------
// 10. Error handling
// --------------------------------------

// Basic 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page not found' });
});

// Generic error handler (helpful for CSRF errors and others)
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.code === 'EBADCSRFTOKEN') {
    // CSRF token mismatch
    return res.status(403).render('error', {
      title: 'Security error',
      message: 'Form has expired or is invalid. Please try again.'
    });
  }

  res.status(500).render('error', {
    title: 'Server error',
    message: 'Something went wrong. Please try again later.'
  });
});

// --------------------------------------
// 11. Start server
// --------------------------------------

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
