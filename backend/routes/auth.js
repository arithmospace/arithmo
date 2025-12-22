const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Validation
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide all fields' });
        }

        // 2. Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Email already registered' });
        }

        // 3. Create User
        const user = new User({
            username,
            email,
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
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                joinedDate: user.createdAt // Send creation date
            }
        });

    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validation
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email and password' });
        }

        // 2. Check for user
        const user = await User.findOne({ email });
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
                email: user.email,
                joinedDate: user.createdAt // Send creation date
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
        // 1. Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        // 2. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Find user (exclude password)
        // Note: 'createdAt' is included by default if {timestamps: true} is in Model
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // 4. Send Response with Date
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                joinedDate: user.createdAt // <--- THIS IS THE KEY PART
            }
        });

    } catch (err) {
        console.error('Profile Error:', err);
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

module.exports = router;