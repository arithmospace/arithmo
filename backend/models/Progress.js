const mongoose = require('mongoose');

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
        levels: {
            type: Map,
            of: new mongoose.Schema({
                status: {
                    type: String,
                    enum: ['not-started', 'in-progress', 'completed', 'locked'],
                    default: 'not-started'
                },
                completedActivities: [Number],
                rewards: {
                    stars: { type: Number, default: 0 },
                    badges: { type: Number, default: 0 },
                    tokens: { type: Number, default: 0 }
                },
                lastActivity: { type: Number, default: 0 },
                completedAt: { type: Date },
                startedAt: { type: Date, default: Date.now }
            }),
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
    timestamps: true
});

// Create index for faster queries
progressSchema.index({ username: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);