require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// ========== MIDDLEWARE ==========
app.use(express.json());

// CORS: Update 'origin' to your specific frontend URL in production for best security
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== AUTH MIDDLEWARE ==========
// We export this so routes can use it if needed, though usually we pass it directly
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification failed:', err.message);
            return res.status(403).json({ success: false, error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ========== MONGODB CONNECTION ==========
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
    console.error("❌ FATAL ERROR: MONGODB_URI is not defined in .env");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });

// ========== ROUTES ==========

// 1. Auth Routes (Login, Signup, Refresh)
// Ensure you have created backend/routes/auth.js and backend/models/User.js
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
// Note: This mounts routes at /api/auth. 
// So inside auth.js, '/' becomes '/api/auth/' (e.g. /api/auth/login)
// IF your auth.js defines routes as '/login', then the full path is /api/auth/login.
// IF your frontend expects /api/login (without /auth), change this line to: app.use('/api', authRoutes);
// Based on your frontend code (API_URL = .../api), and typical auth.js structure, 
// let's mount it at /api so the paths align with your frontend (e.g. /api/login).
app.use('/api', authRoutes);

// 2. Progress Routes (Save/Load Progress)
const progressRoutes = require('./routes/progress');
// We protect these routes with the authenticateToken middleware
app.use('/api/progress', authenticateToken, progressRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running' });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});