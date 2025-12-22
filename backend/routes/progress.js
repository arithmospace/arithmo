const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');        // <--- ADDED THIS
const User = require('../models/User');     // <--- ADDED THIS
const Progress = require('../models/Progress');

// Helper Functions
const createDefaultProgress = () => {
    const defaultProgress = {
        version: "1.0",
        currentLevel: 1,
        lastSync: new Date(),
        levels: {},
        totals: {
            totalStars: 0, totalBadges: 0, totalTokens: 0,
            completedLevels: 0, totalActivitiesCompleted: 0
        }
    };
    for (let i = 1; i <= 5; i++) {
        defaultProgress.levels[i] = {
            status: i === 1 ? "not-started" : "locked",
            completedActivities: [],
            rewards: { stars: 0, badges: 0, tokens: 0 },
            lastActivity: 0,
            startedAt: new Date()
        };
    }
    return defaultProgress;
};

const calculateTotals = (levels) => {
    let totals = { totalStars: 0, totalBadges: 0, totalTokens: 0, completedLevels: 0, totalActivitiesCompleted: 0 };
    Object.keys(levels).forEach(key => {
        const level = levels[key];
        totals.totalStars += level.rewards?.stars || 0;
        totals.totalBadges += level.rewards?.badges || 0;
        totals.totalTokens += level.rewards?.tokens || 0;
        totals.totalActivitiesCompleted += level.completedActivities?.length || 0;
        if (level.status === "completed") totals.completedLevels++;
    });
    return totals;
};

// ==================== MIDDLEWARE ====================
// This function gets the user from the token before the route runs
const getAuthUser = async (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('No token');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) throw new Error('User not found');

    return user;
};

// ==================== ROUTES ====================

// GET /api/progress/load-progress
router.get('/load-progress', async (req, res) => {
    try {
        // 1. Authenticate User
        let user;
        try {
            user = await getAuthUser(req);
        } catch (e) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const username = user.username;

        // 2. Load Progress
        let progressDoc = await Progress.findOne({ username });

        if (!progressDoc) {
            console.log(`🆕 Creating default progress for: ${username}`);
            const defaultProgress = createDefaultProgress();
            // We save both username and userId to be safe
            progressDoc = new Progress({ username, userId: user._id, progressData: defaultProgress });
            await progressDoc.save();
        }

        res.json({ success: true, progressData: progressDoc.progressData });
    } catch (error) {
        console.error('Load Error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// POST /api/progress/update-activity
router.post('/update-activity', async (req, res) => {
    try {
        // 1. Authenticate User
        let user;
        try {
            user = await getAuthUser(req);
        } catch (e) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { level, activity, rewards, isCompleted } = req.body;
        const username = user.username;

        if (!level || !activity) return res.status(400).json({ error: 'Missing data' });

        let progressDoc = await Progress.findOne({ username });
        if (!progressDoc) {
            progressDoc = new Progress({ username, userId: user._id, progressData: createDefaultProgress() });
        }

        let pData = progressDoc.progressData;

        // Initialize level if missing
        if (!pData.levels[level]) {
            pData.levels[level] = {
                status: "in-progress", completedActivities: [],
                rewards: { stars: 0, badges: 0, tokens: 0 },
                lastActivity: 0, startedAt: new Date()
            };
        }

        const lvl = pData.levels[level];

        // Add activity if not already completed
        if (!lvl.completedActivities.includes(activity)) {
            lvl.completedActivities.push(activity);
            lvl.completedActivities.sort((a, b) => a - b);
        }

        // Add Rewards
        if (rewards) {
            lvl.rewards.stars += rewards.stars || 0;
            lvl.rewards.badges += rewards.badges || 0;
            lvl.rewards.tokens += rewards.tokens || 0;
        }

        lvl.lastActivity = Math.max(lvl.lastActivity, activity);

        // Handle Status Updates
        if (isCompleted) {
            lvl.status = "completed";
            lvl.completedAt = new Date();
            const nextLevel = level + 1;
            // Unlock next level
            if (pData.levels[nextLevel] && pData.levels[nextLevel].status === "locked") {
                pData.levels[nextLevel].status = "not-started";
            }
        } else if (lvl.completedActivities.length > 0 && lvl.status === 'not-started') {
            lvl.status = "in-progress";
        }

        // Recalculate Totals
        pData.totals = calculateTotals(pData.levels);
        pData.currentLevel = Math.max(pData.currentLevel, level);
        pData.lastSync = new Date();

        // Save
        progressDoc.markModified('progressData');
        await progressDoc.save();

        res.json({ success: true, progressData: pData });

    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/progress/reset
router.post('/reset', async (req, res) => {
    try {
        // 1. Authenticate User
        let user;
        try {
            user = await getAuthUser(req);
        } catch (e) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        // 2. Find and reset progress (Using username to be consistent)
        let progress = await Progress.findOne({ username: user.username });

        if (progress) {
            // Reset to default empty state
            progress.progressData = createDefaultProgress(); // Reset the data structure
            progress.markModified('progressData');
            await progress.save();
        }

        res.json({ success: true, message: 'Progress reset successfully' });

    } catch (err) {
        console.error('Reset Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

module.exports = router;