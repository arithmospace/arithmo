const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['not-started', 'in-progress', 'completed', 'locked'],
        default: 'locked'
    },
    completedActivities: [Number], // e.g., [1, 2, 3]
    rewards: {
        stars: { type: Number, default: 0 },
        badges: { type: Number, default: 0 },
        tokens: { type: Number, default: 0 }
    },
    lastActivity: { type: Number, default: 0 },
    completedAt: { type: Date },
    startedAt: { type: Date, default: Date.now }
}, { _id: false });

const progressSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    progressData: {
        version: { type: String, default: "1.0" },
        currentLevel: { type: Number, default: 1 },
        lastSync: { type: Date, default: Date.now },
        // IMPORTANT: Using Object (Mixed) to allow flexible level keys (1, 2, 3...)
        levels: {
            type: Object,
            default: {}
        },
        totals: {
            totalStars: { type: Number, default: 0 },
            totalBadges: { type: Number, default: 0 },
            totalTokens: { type: Number, default: 0 },
            completedLevels: { type: Number, default: 0 },
            totalActivitiesCompleted: { type: Number, default: 0 }
        }
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    minimize: false // Ensures empty objects are saved
});

module.exports = mongoose.model('Progress', progressSchema);