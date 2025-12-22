const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Progress = require('../models/Progress');

// ==================== MIDDLEWARE ====================

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification failed:', err.message);
            return res.status(403).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
};

// ==================== HELPER FUNCTIONS ====================

// Create default progress structure
const createDefaultProgress = () => {
    const defaultProgress = {
        version: "1.0",
        currentLevel: 1,
        lastSync: new Date(),
        levels: {},
        totals: {
            totalStars: 0,
            totalBadges: 0,
            totalTokens: 0,
            completedLevels: 0,
            totalActivitiesCompleted: 0
        }
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

// Calculate totals from all levels
const calculateTotals = (levels) => {
    let totalStars = 0;
    let totalBadges = 0;
    let totalTokens = 0;
    let completedLevels = 0;
    let totalActivities = 0;

    for (let i = 1; i <= 5; i++) {
        if (levels[i]) {
            const level = levels[i];
            totalStars += level.rewards?.stars || 0;
            totalBadges += level.rewards?.badges || 0;
            totalTokens += level.rewards?.tokens || 0;
            totalActivities += level.completedActivities?.length || 0;
            if (level.status === "completed") completedLevels++;
        }
    }

    return {
        totalStars,
        totalBadges,
        totalTokens,
        completedLevels,
        totalActivitiesCompleted: totalActivities
    };
};

// ==================== ROUTES ====================

// DEBUG: Health check
router.get('/debug', (req, res) => {
    res.json({
        success: true,
        message: 'Progress router is working!',
        timestamp: new Date().toISOString(),
        endpoints: {
            saveProgress: 'POST /save-progress',
            loadProgress: 'GET /load-progress',
            updateActivity: 'POST /update-activity',
            batchUpdate: 'POST /batch-update',
            forceSync: 'POST /force-sync'
        }
    });
});

// TEST: Test POST endpoint
router.post('/test-post', (req, res) => {
    console.log('Test POST received:', req.body);
    res.json({
        success: true,
        message: 'POST request received!',
        receivedData: req.body,
        timestamp: new Date().toISOString()
    });
});

// ==================== MAIN ROUTES ====================

/**
 * LOAD PROGRESS
 * GET /api/progress/load-progress
 * Returns user's complete progress or creates default
 */
router.get('/load-progress', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        console.log(`📥 Loading progress for: ${username}`);

        let progressDoc = await Progress.findOne({ username });

        // If no progress exists, create default
        if (!progressDoc) {
            console.log(`🆕 Creating default progress for: ${username}`);
            const defaultProgress = createDefaultProgress();

            progressDoc = new Progress({
                username,
                progressData: defaultProgress
            });
            await progressDoc.save();

            return res.json({
                success: true,
                progressData: defaultProgress,
                message: 'Default progress created'
            });
        }

        // Return existing progress
        res.json({
            success: true,
            progressData: progressDoc.progressData,
            lastUpdated: progressDoc.lastUpdated
        });

    } catch (error) {
        console.error('❌ Load progress error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * SAVE COMPLETE PROGRESS
 * POST /api/progress/save-progress
 * Overwrites entire progress data
 */
router.post('/save-progress', authenticateToken, async (req, res) => {
    try {
        const { progressData } = req.body;
        const username = req.user.username;

        console.log(`💾 Saving complete progress for: ${username}`);

        // Validate progress data
        if (!progressData || typeof progressData !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid progress data'
            });
        }

        // Add timestamp
        progressData.lastSync = new Date();

        // Save to database
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

        console.log(`✅ Progress saved for: ${username}`);

        res.json({
            success: true,
            message: 'Progress saved successfully',
            lastUpdated: updatedProgress.lastUpdated,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Save progress error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * UPDATE SINGLE ACTIVITY
 * POST /api/progress/update-activity
 * Updates one activity completion
 */
router.post('/update-activity', authenticateToken, async (req, res) => {
    try {
        const { level, activity, rewards, isCompleted } = req.body;
        const username = req.user.username;

        console.log(`🎯 Updating activity for ${username}: Level ${level}, Activity ${activity}`);

        // Validate input
        if (!level || !activity) {
            return res.status(400).json({
                success: false,
                error: 'Level and activity are required'
            });
        }

        // Find or create progress
        let progressDoc = await Progress.findOne({ username });

        let progressData;
        if (!progressDoc) {
            console.log(`🆕 Creating new progress for: ${username}`);
            progressData = createDefaultProgress();
            progressDoc = new Progress({
                username,
                progressData
            });
        } else {
            progressData = progressDoc.progressData;
        }

        // Ensure levels object exists
        if (!progressData.levels) {
            progressData.levels = {};
        }

        // Ensure this level exists
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

        // Add activity if not already completed
        if (!levelProgress.completedActivities.includes(activity)) {
            levelProgress.completedActivities.push(activity);
            levelProgress.completedActivities.sort((a, b) => a - b);
        }

        // Add rewards
        if (rewards) {
            levelProgress.rewards.stars += rewards.stars || 0;
            levelProgress.rewards.badges += rewards.badges || 0;
            levelProgress.rewards.tokens += rewards.tokens || 0;
        }

        // Update last activity
        levelProgress.lastActivity = Math.max(levelProgress.lastActivity, activity);

        // Update level status
        if (isCompleted) {
            levelProgress.status = "completed";
            levelProgress.completedAt = new Date();
        } else if (levelProgress.completedActivities.length > 0) {
            levelProgress.status = "in-progress";
        }

        // Unlock next level if current is completed
        if (isCompleted && level < 5) {
            const nextLevel = level + 1;
            if (!progressData.levels[nextLevel]) {
                progressData.levels[nextLevel] = {
                    status: "not-started",
                    completedActivities: [],
                    rewards: { stars: 0, badges: 0, tokens: 0 },
                    lastActivity: 0,
                    startedAt: new Date()
                };
            } else if (progressData.levels[nextLevel].status === "locked") {
                progressData.levels[nextLevel].status = "not-started";
            }
        }

        // Recalculate totals
        progressData.totals = calculateTotals(progressData.levels);

        // Update current level
        progressData.currentLevel = Math.max(progressData.currentLevel || 1, level);
        progressData.lastSync = new Date();

        // Save to database
        progressDoc.progressData = progressData;
        progressDoc.lastUpdated = new Date();
        await progressDoc.save();

        console.log(`✅ Activity updated for ${username}: Level ${level}, Activity ${activity}`);

        res.json({
            success: true,
            message: 'Activity updated successfully',
            progressData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Update activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * BATCH UPDATE (NEW)
 * POST /api/progress/batch-update
 * Updates multiple activities at once
 */
router.post('/batch-update', authenticateToken, async (req, res) => {
    try {
        const { updates } = req.body; // Array of {level, activity, rewards, isCompleted}
        const username = req.user.username;

        console.log(`📦 Batch updating ${updates.length} activities for: ${username}`);

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Updates array is required'
            });
        }

        // Find or create progress
        let progressDoc = await Progress.findOne({ username });
        let progressData;

        if (!progressDoc) {
            progressData = createDefaultProgress();
            progressDoc = new Progress({ username, progressData });
        } else {
            progressData = progressDoc.progressData;
        }

        // Process each update
        for (const update of updates) {
            const { level, activity, rewards, isCompleted } = update;

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

            // Add activity
            if (!levelProgress.completedActivities.includes(activity)) {
                levelProgress.completedActivities.push(activity);
                levelProgress.completedActivities.sort((a, b) => a - b);
            }

            // Add rewards
            if (rewards) {
                levelProgress.rewards.stars += rewards.stars || 0;
                levelProgress.rewards.badges += rewards.badges || 0;
                levelProgress.rewards.tokens += rewards.tokens || 0;
            }

            // Update status
            levelProgress.lastActivity = Math.max(levelProgress.lastActivity, activity);
            if (isCompleted) {
                levelProgress.status = "completed";
                levelProgress.completedAt = new Date();
            } else if (levelProgress.completedActivities.length > 0) {
                levelProgress.status = "in-progress";
            }
        }

        // Recalculate totals
        progressData.totals = calculateTotals(progressData.levels);
        progressData.lastSync = new Date();

        // Save
        progressDoc.progressData = progressData;
        progressDoc.lastUpdated = new Date();
        await progressDoc.save();

        console.log(`✅ Batch update completed for: ${username}`);

        res.json({
            success: true,
            message: `${updates.length} activities updated successfully`,
            progressData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Batch update error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * FORCE SYNC (NEW)
 * POST /api/progress/force-sync
 * Manually trigger sync from frontend
 */
router.post('/force-sync', authenticateToken, async (req, res) => {
    try {
        const { progressData } = req.body;
        const username = req.user.username;

        console.log(`🔄 Force sync requested by: ${username}`);

        if (!progressData) {
            return res.status(400).json({
                success: false,
                error: 'Progress data required for force sync'
            });
        }

        // Get current backend data
        const backendDoc = await Progress.findOne({ username });

        // Compare timestamps
        const backendTime = backendDoc?.lastUpdated || new Date(0);
        const clientTime = new Date(progressData.lastSync);

        console.log(`Backend time: ${backendTime}, Client time: ${clientTime}`);

        // If backend is newer, return conflict
        if (backendTime > clientTime) {
            console.log(`⚠️ Conflict detected for ${username}`);
            return res.status(409).json({
                success: false,
                error: 'Conflict: Backend has newer data',
                conflict: true,
                backendData: backendDoc.progressData,
                backendTime: backendTime,
                clientTime: clientTime
            });
        }

        // Client is newer or equal, save it
        progressData.lastSync = new Date();

        const updatedProgress = await Progress.findOneAndUpdate(
            { username },
            {
                progressData: progressData,
                lastUpdated: new Date()
            },
            {
                upsert: true,
                new: true
            }
        );

        console.log(`✅ Force sync completed for: ${username}`);

        res.json({
            success: true,
            message: 'Force sync successful',
            progressData: updatedProgress.progressData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Force sync error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;