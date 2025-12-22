const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure path is correct

require('dotenv').config();

// ============================================================
// TOKEN REFRESH ENDPOINT
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
        // Note: verify() throws on expiration, so we catch it
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