const express = require('express');
const router = express.Router();
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

// ==================== ROUTES ====================

// GET /api/progress/load-progress
router.get('/load-progress', async (req, res) => {
    try {
        const username = req.user.username;
        let progressDoc = await Progress.findOne({ username });

        if (!progressDoc) {
            console.log(`🆕 Creating default progress for: ${username}`);
            const defaultProgress = createDefaultProgress();
            progressDoc = new Progress({ username, progressData: defaultProgress });
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
        const { level, activity, rewards, isCompleted } = req.body;
        const username = req.user.username;

        if (!level || !activity) return res.status(400).json({ error: 'Missing data' });

        let progressDoc = await Progress.findOne({ username });
        if (!progressDoc) {
            progressDoc = new Progress({ username, progressData: createDefaultProgress() });
        }

        let pData = progressDoc.progressData;

        if (!pData.levels[level]) {
            pData.levels[level] = {
                status: "in-progress", completedActivities: [],
                rewards: { stars: 0, badges: 0, tokens: 0 },
                lastActivity: 0, startedAt: new Date()
            };
        }

        const lvl = pData.levels[level];

        if (!lvl.completedActivities.includes(activity)) {
            lvl.completedActivities.push(activity);
            lvl.completedActivities.sort((a, b) => a - b);
        }

        if (rewards) {
            lvl.rewards.stars += rewards.stars || 0;
            lvl.rewards.badges += rewards.badges || 0;
            lvl.rewards.tokens += rewards.tokens || 0;
        }

        lvl.lastActivity = Math.max(lvl.lastActivity, activity);

        if (isCompleted) {
            lvl.status = "completed";
            lvl.completedAt = new Date();
            const nextLevel = level + 1;
            if (pData.levels[nextLevel] && pData.levels[nextLevel].status === "locked") {
                pData.levels[nextLevel].status = "not-started";
            }
        } else if (lvl.completedActivities.length > 0 && lvl.status === 'not-started') {
            lvl.status = "in-progress";
        }

        pData.totals = calculateTotals(pData.levels);
        pData.currentLevel = Math.max(pData.currentLevel, level);
        pData.lastSync = new Date();

        progressDoc.markModified('progressData');
        await progressDoc.save();

        res.json({ success: true, progressData: pData });

    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// @route   POST /api/progress/reset
// @desc    Reset all user progress
// @access  Private
router.post('/reset', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, error: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find and reset progress
        let progress = await Progress.findOne({ userId: decoded.userId });

        if (progress) {
            // Reset to default empty state
            progress.levels = {};
            progress.totals = { totalStars: 0, totalBadges: 0, totalTokens: 0 };
            await progress.save();
        }

        res.json({ success: true, message: 'Progress reset successfully' });

    } catch (err) {
        console.error('Reset Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

module.exports = router;