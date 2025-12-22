const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST /api/auth/signup
// @desc    Register a new user (Username only)
// @access  Public
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Validation
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Please provide username and password' });
        }

        // 2. Check if user exists (Check Username)
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Username already taken' });
        }

        // 3. Create User
        const user = new User({
            username,
            password
        });

        await user.save();

        // 4. Create Token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            token,
            // Generate a fake recovery code since we don't have email
            recoveryCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
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
// @desc    Login user (Username only)
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Validation
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Please provide username and password' });
        }

        // 2. Check for user (By Username)
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        // 3. Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        // 4. Create Token
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
// @desc    Get current user data
// @access  Private
router.get('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select('-password');

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

module.exports = router;