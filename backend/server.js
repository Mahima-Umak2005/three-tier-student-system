require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy

// CORS: only the Netlify frontend (plus optional extra origins). Requests with
// no Origin header (curl, the MCP server, Render health checks) are allowed
// because CORS only governs browsers.
const allowed = [process.env.FRONTEND_URL, ...(process.env.EXTRA_ORIGINS || '').split(',')]
  .map((o) => o && o.trim().replace(/\/$/, '')).filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => (!origin || allowed.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json({ limit: '10kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, max: 120 }));

app.get('/', (_req, res) => res.json({ status: 'ok', service: 'student-api' }));
app.use('/api/students', require('./routes/studentRoutes'));

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, _req, res, _next) => {
  const status = err.message === 'Not allowed by CORS' ? 403 : 500;
  res.status(status).json({ success: false, message: status === 403 ? 'Origin not allowed' : 'Server error' });
});

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)))
  .catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
