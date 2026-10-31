/**
 * CampusFind 2.0 - Server Entry Point
 * Smart Campus Lost & Found Management Platform
 * Serves both the REST API backend and the Frontend web application
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import database connection
const { testConnection } = require('./config/db');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const itemRoutes = require('./routes/itemRoutes');
const matchingRoutes = require('./routes/matchingRoutes');
const claimRoutes = require('./routes/claimRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');

// Import Middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware: Cross-Origin Resource Sharing (CORS) with Credentials
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser agents (Postman, curl), file:// origins ('null'), or defined local ports
    if (!origin || origin === 'null' || allowedOrigins.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Middleware: Request Body & Cookie Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded item images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Frontend Web Application as static files
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// API Overview Endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    project: 'CampusFind 2.0',
    description: 'Smart Campus Lost & Found Management Platform API',
    status: 'online',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health-Check API Endpoint: GET /api/health
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'CampusFind 2.0 API and Database connection are operational.',
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/matches', matchingRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// Fallback for frontend root: serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// 404 Handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

// Start the Express Server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(` CampusFind 2.0 Web Application & API Running!`);
  console.log(` Web App URL : http://localhost:${PORT}`);
  console.log(` Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(` Health API  : http://localhost:${PORT}/api/health`);
  console.log(` Auth APIs   : http://localhost:${PORT}/api/auth`);
  console.log(` Items API   : http://localhost:${PORT}/api/items`);
  console.log(` Matches API : http://localhost:${PORT}/api/matches`);
  console.log(` Claims API  : http://localhost:${PORT}/api/claims`);
  console.log(` Notifs API  : http://localhost:${PORT}/api/notifications`);
  console.log(` Dash API    : http://localhost:${PORT}/api/dashboard`);
  console.log(` Users API   : http://localhost:${PORT}/api/users`);
  console.log(`====================================================`);

  // Verify MySQL Connection Pool
  await testConnection();
});

module.exports = app;
