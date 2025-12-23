const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Kept for consistency, though hashing is handled in User model
const User = require('../models/User');

// @route   POST /api/auth/signup
// @desc    Register a new user
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Validation
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Please provide username and password' });
        }

        // 2. Check duplicate
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Username already taken' });
        }

        // 3. Generate Recovery Code (Static - generated once at signup)
        const recoveryCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        // 4. Create User (Saving the recovery code now)
        const user = new User({
            username,
            password,
            recoveryCode
        });

        await user.save();

        // 5. Generate Token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            token,
            recoveryCode, // Send back to frontend to display to user
            user: {
                id: user._id,
                username: user.username,
                joinedDate: user.createdAt
            }
        });

    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Please provide username and password' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                joinedDate: user.createdAt
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   GET /api/auth/profile
// @desc    Get user info
router.get('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password -recoveryCode');

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                joinedDate: user.createdAt
            }
        });

    } catch (err) {
        console.error('Profile Error:', err);
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

// @route   POST /api/auth/recover-lookup
// @desc    Check if user exists (Step 1 of Forgot Password)
router.post('/recover-lookup', async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // We found the user. Frontend should now ask for the code.
        res.json({ success: true, message: 'User found' });

    } catch (err) {
        console.error('Recovery Lookup Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with code (Step 2 of Forgot Password)
router.post('/reset-password', async (req, res) => {
    try {
        const { username, recoveryCode, newPassword } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Validate Code (Case Insensitive)
        if (!user.recoveryCode || user.recoveryCode !== recoveryCode.toUpperCase()) {
            return res.status(400).json({ success: false, error: 'Invalid Recovery Code' });
        }

        // Update Password
        // Note: The pre-save hook in User.js handles hashing.
        user.password = newPassword;

        // NOTE: Recovery code update logic has been completely removed here.
        // The user.recoveryCode will NOT change.

        await user.save();

        res.json({ success: true, message: 'Password reset successful' });

    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

module.exports = router;