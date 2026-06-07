require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes   = require('./routes/authRoutes');
const assessRoutes = require('./routes/assessRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes  = require('./routes/adminRoutes');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`KSB Personality Analyser server running on port ${PORT}`);
});
