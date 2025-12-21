const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Progress = require('../models/Progress');

// ========== DEBUG/HEALTH CHECK ROUTES ==========
router.get('/debug', (req, res) => {
    res.json({
        success: true,
        message: 'Progress router is working!',
        timestamp: new Date().toISOString(),
        endpoints: {
            saveProgress: 'POST /save-progress',
            loadProgress: 'GET /load-progress',
            updateActivity: 'POST /update-activity'
        }
    });
});

// Test route for POST request
router.post('/test-post', (req, res) => {
    console.log('Test POST received:', req.body);
    res.json({
        success: true,
        message: 'POST request received!',
        receivedData: req.body,
        timestamp: new Date().toISOString()
    });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, error: 'Access token required' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Helper: Create default progress
const createDefaultProgress = () => {
    const defaultProgress = {
        version: "1.0",
        currentLevel: 1,
        lastSync: new Date(),
        levels: {},
        totals: { totalStars: 0, totalBadges: 0, totalTokens: 0, completedLevels: 0, totalActivitiesCompleted: 0 }
    };

    // Initialize all 5 levels
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

// 1. SAVE COMPLETE PROGRESS
router.post('/save-progress', (req, res, next) => {
    // Call server's authenticateToken logic directly
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, error: 'Access token required' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Invalid token' });
        req.user = user;
        next();
    });
}, async (req, res) => {
    try {
        const { progressData } = req.body;
        const username = req.user.username;

        if (!progressData || typeof progressData !== 'object') {
            return res.status(400).json({ success: false, error: 'Invalid progress data' });
        }

        const updatedProgress = await Progress.findOneAndUpdate(
            { username },
            {
                progressData: progressData,
                lastUpdated: new Date()
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        res.json({
            success: true,
            message: 'Progress saved successfully',
            lastUpdated: updatedProgress.lastUpdated
        });

    } catch (error) {
        console.error('Save progress error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 2. LOAD PROGRESS
router.get('/load-progress', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;

        const progressDoc = await Progress.findOne({ username });

        if (!progressDoc) {
            const defaultProgress = createDefaultProgress();

            const newProgress = new Progress({
                username,
                progressData: defaultProgress
            });
            await newProgress.save();

            return res.json({ success: true, progressData: defaultProgress });
        }

        res.json({
            success: true,
            progressData: progressDoc.progressData
        });

    } catch (error) {
        console.error('Load progress error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 3. UPDATE SINGLE ACTIVITY
router.post('/update-activity', authenticateToken, async (req, res) => {
    try {
        const { level, activity, rewards, isCompleted } = req.body;
        const username = req.user.username;

        let progressDoc = await Progress.findOne({ username });

        let progressData;
        if (!progressDoc) {
            progressData = createDefaultProgress();
            progressDoc = new Progress({
                username,
                progressData
            });
        } else {
            progressData = progressDoc.progressData;
        }

        if (!progressData.levels) {
            progressData.levels = {};
        }

        if (!progressData.levels[level]) {
            progressData.levels[level] = {
                status: "in-progress",
                completedActivities: [],
                rewards: { stars: 0, badges: 0, tokens: 0 },
                lastActivity: 0,
                startedAt: new Date()
            };
        }

        const levelProgress = progressData.levels[level];

        if (!levelProgress.completedActivities.includes(activity)) {
            levelProgress.completedActivities.push(activity);
            levelProgress.completedActivities.sort((a, b) => a - b);
        }

        if (rewards) {
            levelProgress.rewards.stars += rewards.stars || 0;
            levelProgress.rewards.badges += rewards.badges || 0;
            levelProgress.rewards.tokens += rewards.tokens || 0;
        }

        levelProgress.lastActivity = Math.max(levelProgress.lastActivity, activity);

        if (isCompleted) {
            levelProgress.status = "completed";
            levelProgress.completedAt = new Date();
        } else if (levelProgress.completedActivities.length > 0) {
            levelProgress.status = "in-progress";
        }

        if (isCompleted && level < 5) {
            const nextLevel = level + 1;
            if (!progressData.levels[nextLevel]) {
                progressData.levels[nextLevel] = {
                    status: "not-started",
                    completedActivities: [],
                    rewards: { stars: 0, badges: 0, tokens: 0 },
                    lastActivity: 0
                };
            } else if (progressData.levels[nextLevel].status === "locked") {
                progressData.levels[nextLevel].status = "not-started";
            }
        }

        let totalStars = 0;
        let totalBadges = 0;
        let totalTokens = 0;
        let completedLevels = 0;
        let totalActivities = 0;

        for (let i = 1; i <= 5; i++) {
            if (progressData.levels[i]) {
                const l = progressData.levels[i];
                totalStars += l.rewards?.stars || 0;
                totalBadges += l.rewards?.badges || 0;
                totalTokens += l.rewards?.tokens || 0;
                totalActivities += l.completedActivities?.length || 0;
                if (l.status === "completed") completedLevels++;
            }
        }

        progressData.totals = {
            totalStars,
            totalBadges,
            totalTokens,
            completedLevels,
            totalActivitiesCompleted: totalActivities
        };

        progressData.currentLevel = Math.max(progressData.currentLevel || 1, level);
        progressData.lastSync = new Date();

        progressDoc.progressData = progressData;
        progressDoc.lastUpdated = new Date();
        await progressDoc.save();

        res.json({
            success: true,
            message: 'Activity updated successfully',
            progressData
        });

    } catch (error) {
        console.error('Update activity error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;