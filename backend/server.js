require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(cors({
    origin: '*', // Allow all origins for now
    credentials: true
}));

// Add this BEFORE your other routes:
app.get('/api', (req, res) => {
    res.json({
        message: '🚀 Arithmo API is running!',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: {
                register: '/api/auth/register',
                login: '/api/auth/login'
            },
            users: '/api/users',
            // Add more endpoints you have
        },
        documentation: 'Add your docs link here',
        timestamp: new Date().toISOString()
    });
});

// JWT Secret (SET THIS IN RENDER.COM ENVIRONMENT VARIABLES!)
const JWT_SECRET = process.env.JWT_SECRET;

// ========== MONGODB CONNECTION ==========
const MONGO_URI = process.env.MONGODB_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// ========== USER SCHEMA ==========
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    recoveryCode: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// ========== JWT AUTH MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification failed:', err.message);
            return res.status(403).json({ success: false, error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ========== HELPER FUNCTIONS ==========
function generateRecoveryCode() {
    return crypto.randomBytes(8).toString('hex').toUpperCase().slice(0, 12);
}

// ========== API ROUTES ==========

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running', jwtEnabled: true });
});

// Root
app.get('/', (req, res) => {
    res.send('Arithmo Backend with JWT Authentication');
});

// Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'All fields required' });
        }

        if (username.length < 3) {
            return res.status(400).json({ success: false, error: 'Username must be at least 3 characters' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }

        const recoveryCode = generateRecoveryCode();
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            password: hashedPassword,
            recoveryCode
        });

        await user.save();

        // Generate JWT token immediately after signup
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            recoveryCode,
            username: user.username,
            userId: user._id,
            token // Send JWT token
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, error: 'Server error during signup' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: `Welcome ${username}!`,
            username: user.username,
            userId: user._id,
            token // JWT token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error during login' });
    }
});

// Protected Route Example - Get User Profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password -recoveryCode');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                username: user.username,
                createdAt: user.createdAt,
                id: user._id
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Validate Token (frontend can check if token is still valid)
app.post('/api/validate-token', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user,
        message: 'Token is valid'
    });
});

// Recover Lookup
app.post('/api/recover-lookup', async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Enter your recovery code',
            hint: 'Check your saved recovery code'
        });

    } catch (error) {
        console.error('Recover lookup error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { username, recoveryCode, newPassword } = req.body;

        if (!username || !recoveryCode || !newPassword) {
            return res.status(400).json({ success: false, error: 'All fields required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        const user = await User.findOne({ username });
        if (!user || user.recoveryCode !== recoveryCode.trim().toUpperCase()) {
            return res.status(400).json({ success: false, error: 'Invalid recovery code' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successful. Please login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET ? 'Set' : 'NOT SET - using default'}`);
});