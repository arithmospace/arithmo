const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: '*', // Allow all for now
    credentials: true
}));

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/arithmo';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    recoveryCode: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Helper: Generate Recovery Code
function generateRecoveryCode() {
    return crypto.randomBytes(8).toString('hex').toUpperCase().slice(0, 12);
}

// ========== ROUTES ==========

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Root route
app.get('/', (req, res) => {
    res.send('Arithmo Backend is running. Use /api endpoints.');
});

// Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'All fields required' });
        }

        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ success: false, error: 'Username exists' });
        }

        const recoveryCode = generateRecoveryCode();
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            password: hashedPassword,
            recoveryCode
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'Account created',
            recoveryCode,
            username
        });

    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        res.json({
            success: true,
            message: `Welcome ${username}!`,
            username
        });

    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Recover Lookup
app.post('/api/recover-lookup', async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, message: 'Enter recovery code' });

    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { username, recoveryCode, newPassword } = req.body;

        const user = await User.findOne({ username });
        if (!user || user.recoveryCode !== recoveryCode) {
            return res.status(400).json({ success: false, error: 'Invalid code' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ success: true, message: 'Password reset successful' });

    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});