const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ success: false, error: 'Please provide username and password' });

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ success: false, error: 'Username already taken' });

        const recoveryCode = (Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)).substring(0, 12).toUpperCase();

        const user = new User({ username, password, recoveryCode });
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            token,
            recoveryCode,
            user: { id: user._id, username: user.username, joinedDate: user.createdAt }
        });
    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ success: false, error: 'Please provide username and password' });

        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ success: false, error: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ success: false, error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: { id: user._id, username: user.username, joinedDate: user.createdAt }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   GET /api/auth/profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // SECURITY UPDATE: We do NOT send recoveryCode here anymore.
        const user = await User.findById(decoded.userId).select('-password -recoveryCode');

        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

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

// @route   POST /api/auth/reveal-recovery-code
// @desc    Verify password and return recovery code
router.post('/reveal-recovery-code', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { password } = req.body;

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ success: false, error: 'Incorrect password' });

        // Password verified, send the code
        res.json({ success: true, recoveryCode: user.recoveryCode });

    } catch (err) {
        console.error('Reveal Code Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(400).json({ success: false, error: 'Incorrect current password' });

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (err) {
        console.error('Change Password Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   POST /api/auth/recover-lookup
router.post('/recover-lookup', async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, message: 'User found' });
    } catch (err) {
        console.error('Recovery Lookup Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { username, recoveryCode, newPassword } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        if (!user.recoveryCode || user.recoveryCode !== recoveryCode.toUpperCase()) {
            return res.status(400).json({ success: false, error: 'Invalid Recovery Code' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password reset successful' });
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   POST /api/auth/verify-password
// @desc    Verify password (helper for sensitive actions)
router.post('/verify-password', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { password } = req.body;

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ success: false, error: 'Incorrect password' });

        res.json({ success: true });

    } catch (err) {
        console.error('Verify Password Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

module.exports = router;