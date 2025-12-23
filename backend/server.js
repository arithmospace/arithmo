require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// ========== MIDDLEWARE ==========
app.use(express.json());

// CORS
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== AUTH MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ========== MONGODB CONNECTION ==========
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
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

// 1. Auth Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
// Makes: /api/auth/login, /api/auth/signup, /api/auth/recover-lookup, etc.

// 2. Progress Routes
const progressRoutes = require('./routes/progress');
app.use('/api/progress', authenticateToken, progressRoutes);

// 3. Contact Routes
const contactRoutes = require('./routes/contact');
app.use('/api/contact', contactRoutes);
// Makes: /api/contact/send

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running' });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});