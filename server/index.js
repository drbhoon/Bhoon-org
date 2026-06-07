require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const path         = require('path');

const runMigrations = require('./runMigrations');
const authRoutes   = require('./routes/authRoutes');
const assessRoutes = require('./routes/assessRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes  = require('./routes/adminRoutes');

const app  = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'https://peoplescience.bhoon.org',
  'https://stocks.bhoon.org',
  'https://bhoon.org',
  'http://localhost:3001',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. curl, Postman, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth',   authRoutes);
app.use('/api/assess', assessRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/admin',  adminRoutes);

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Apply DB migrations (idempotent) before accepting traffic, then start.
runMigrations()
  .catch((err) => {
    console.error('[migrate] failed:', err.message);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`KSB Personality Analyser server running on port ${PORT}`);
    });
  });
