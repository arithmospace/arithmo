const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');

require('dotenv').config();

// Helper: Generate 12-char recovery code
function generateRecoveryCode() {
    return crypto.randomBytes(8).toString('hex').toUpperCase().slice(0, 12);
}

// ============================================================
// 1. SIGNUP
// ============================================================
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Fields required' });

        // Check if user exists
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: 'Username exists' });

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);
        const recoveryCode = generateRecoveryCode();

        // Create User
        const user = new User({ username, password: hashedPassword, recoveryCode });
        await user.save();

        // Generate Token
        const token = jwt.sign({ userId: user._id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ success: true, token, username, recoveryCode, userId: user._id });
    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 2. LOGIN
// ============================================================
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        // Generate Token
        const token = jwt.sign({ userId: user._id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ success: true, token, username, userId: user._id });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// 3. RECOVER ACCOUNT (Lookup)
// ============================================================
router.post('/recover-lookup', async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });

        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // We found the user, now ask frontend to prompt for Recovery Code
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================================
// 4. RESET PASSWORD
// ============================================================
router.post('/reset-password', async (req, res) => {
    try {
        const { username, recoveryCode, newPassword } = req.body;

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // Check Recovery Code (Case insensitive)
        if (user.recoveryCode !== recoveryCode.toUpperCase()) {
            return res.status(400).json({ success: false, error: 'Invalid recovery code' });
        }

        // Hash New Password
        user.password = await bcrypt.hash(newPassword, 10);
        // Rotate recovery code for security
        user.recoveryCode = generateRecoveryCode();
        await user.save();

        res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================================
// 5. REFRESH TOKEN
// ============================================================
router.post('/refresh-token', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const oldToken = authHeader && authHeader.replace('Bearer ', '');

        if (!oldToken) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        // Decode without verifying signature first to handle expired tokens
        const decoded = jwt.decode(oldToken);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ success: false, error: 'Invalid token format' });
        }

        // Check if user still exists
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Verify the old token (we allow it to be expired, but signature must be valid)
        try {
            jwt.verify(oldToken, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name !== 'TokenExpiredError') {
                return res.status(403).json({ success: false, error: 'Invalid token signature' });
            }
        }

        // Generate NEW token (7 days)
        const newToken = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token: newToken,
            username: user.username,
            userId: user._id.toString()
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

module.exports = router;