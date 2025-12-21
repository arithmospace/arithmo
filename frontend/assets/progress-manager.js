/**
 * ARITHMO PROGRESS MANAGER
 * Handles saving/loading progress across devices
 */

class ProgressManager {
    constructor() {
        this.API_BASE = 'https://arithmobackend.onrender.com/api';
        this.progress = null;
        this.syncQueue = [];
        this.isOnline = navigator.onLine;
        this.isSyncing = false;

        this.init();
    }

    async init() {
        console.log('🔧 Progress Manager Initializing...');

        // Load from localStorage first (fast)
        this.loadLocalProgress();

        // Setup online/offline detection
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Try to sync with backend
        await this.syncWithBackend();

        // Auto-save before page closes
        window.addEventListener('beforeunload', () => this.saveLocalProgress());

        // Periodic sync (every 2 minutes)
        setInterval(() => this.syncWithBackend(), 120000);

        console.log('✅ Progress Manager Ready');
    }

    // ========== LOAD PROGRESS ==========
    async loadProgress() {
        try {
            // 1. Try to load from backend
            const backendProgress = await this.loadFromBackend();
            if (backendProgress) {
                this.progress = backendProgress;
                this.saveLocalProgress();
                return this.progress;
            }

            // 2. Fallback to localStorage
            if (!this.progress) {
                this.loadLocalProgress();
            }

            // 3. If still no progress, create default
            if (!this.progress) {
                this.createDefaultProgress();
            }

            return this.progress;

        } catch (error) {
            console.error('❌ Error loading progress:', error);
            this.loadLocalProgress();
            return this.progress;
        }
    }

    async loadFromBackend() {
        const token = localStorage.getItem('arithmo_jwt');
        if (!token) {
            console.log('⚠️ No JWT token, skipping backend load');
            return null;
        }

        try {
            const response = await fetch(`${this.API_BASE}/progress/load-progress`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('✅ Progress loaded from backend');
                    return data.progressData;
                }
            }
        } catch (error) {
            console.log('🌐 Cannot reach backend, using local progress');
        }

        return null;
    }

    loadLocalProgress() {
        try {
            const saved = localStorage.getItem('arithmo_progress');
            if (saved) {
                this.progress = JSON.parse(saved);
                console.log('📁 Progress loaded from localStorage');
            }
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error);
        }
    }

    createDefaultProgress() {
        console.log('🆕 Creating default progress');

        this.progress = {
            version: "1.0",
            currentLevel: 1,
            lastSync: new Date().toISOString(),
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
            this.progress.levels[i] = {
                status: i === 1 ? "not-started" : "locked",
                completedActivities: [],
                rewards: { stars: 0, badges: 0, tokens: 0 },
                lastActivity: 0
            };
        }

        this.saveLocalProgress();
    }

    // ========== SAVE PROGRESS ==========
    async saveActivityProgress(level, activity, rewards = {}, isCompleted = false) {
        console.log(`💾 Saving progress: Level ${level}, Activity ${activity}`);

        // Update local progress immediately
        this.updateLocalProgress(level, activity, rewards, isCompleted);

        // Save to localStorage
        this.saveLocalProgress();

        // Queue for backend sync
        await this.queueBackendSync(level, activity, rewards, isCompleted);

        return this.progress;
    }

    updateLocalProgress(level, activity, rewards, isCompleted) {
        // Ensure level exists
        if (!this.progress.levels[level]) {
            this.progress.levels[level] = {
                status: "in-progress",
                completedActivities: [],
                rewards: { stars: 0, badges: 0, tokens: 0 },
                lastActivity: 0
            };
        }

        const levelProgress = this.progress.levels[level];

        // Add activity if not already completed
        if (!levelProgress.completedActivities.includes(activity)) {
            levelProgress.completedActivities.push(activity);
            levelProgress.completedActivities.sort((a, b) => a - b);
        }

        // Update rewards
        levelProgress.rewards.stars += rewards.stars || 0;
        levelProgress.rewards.badges += rewards.badges || 0;
        levelProgress.rewards.tokens += rewards.tokens || 0;

        // Update status
        levelProgress.lastActivity = Math.max(levelProgress.lastActivity, activity);

        if (isCompleted) {
            levelProgress.status = "completed";
            levelProgress.completedAt = new Date().toISOString();
        } else if (levelProgress.completedActivities.length > 0) {
            levelProgress.status = "in-progress";
        }

        // Unlock next level if this one is completed
        if (isCompleted && level < 5) {
            const nextLevel = level + 1;
            if (this.progress.levels[nextLevel].status === "locked") {
                this.progress.levels[nextLevel].status = "not-started";
            }
        }

        // Update current level
        this.progress.currentLevel = Math.max(this.progress.currentLevel, level);

        // Update totals
        this.updateTotals();

        this.progress.lastSync = new Date().toISOString();
    }

    updateTotals() {
        let totalStars = 0;
        let totalBadges = 0;
        let totalTokens = 0;
        let completedLevels = 0;
        let totalActivities = 0;

        for (let i = 1; i <= 5; i++) {
            const level = this.progress.levels[i];
            if (level) {
                totalStars += level.rewards.stars || 0;
                totalBadges += level.rewards.badges || 0;
                totalTokens += level.rewards.tokens || 0;
                totalActivities += level.completedActivities?.length || 0;
                if (level.status === "completed") completedLevels++;
            }
        }

        this.progress.totals = {
            totalStars,
            totalBadges,
            totalTokens,
            completedLevels,
            totalActivitiesCompleted: totalActivities
        };
    }

    saveLocalProgress() {
        try {
            localStorage.setItem('arithmo_progress', JSON.stringify(this.progress));
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    }

    // ========== BACKEND SYNC ==========
    async queueBackendSync(level, activity, rewards, isCompleted) {
        const syncItem = {
            level,
            activity,
            rewards,
            isCompleted,
            timestamp: Date.now()
        };

        this.syncQueue.push(syncItem);

        // Try to sync immediately if online
        if (this.isOnline && !this.isSyncing) {
            await this.processSyncQueue();
        }
    }

    async processSyncQueue() {
        if (this.isSyncing || this.syncQueue.length === 0) return;

        this.isSyncing = true;
        const token = localStorage.getItem('arithmo_jwt');

        if (!token) {
            console.log('⚠️ No JWT token, skipping sync');
            this.isSyncing = false;
            return;
        }

        console.log(`🔄 Syncing ${this.syncQueue.length} items to backend...`);

        while (this.syncQueue.length > 0) {
            const item = this.syncQueue[0];

            try {
                const response = await fetch(`${this.API_BASE}/progress/update-activity`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        level: item.level,
                        activity: item.activity,
                        rewards: item.rewards,
                        isCompleted: item.isCompleted
                    })
                });

                if (response.ok) {
                    // Successfully synced, remove from queue
                    this.syncQueue.shift();
                    console.log(`✅ Synced Level ${item.level}, Activity ${item.activity}`);
                } else {
                    // Keep in queue for retry
                    console.warn('⚠️ Sync failed, will retry later');
                    break;
                }
            } catch (error) {
                console.log('🌐 Network error, stopping sync');
                break;
            }
        }

        this.isSyncing = false;

        // If queue is empty, do a full sync
        if (this.syncQueue.length === 0) {
            await this.fullSyncWithBackend();
        }
    }

    async fullSyncWithBackend() {
        const token = localStorage.getItem('arithmo_jwt');
        if (!token || !this.progress) return;

        try {
            await fetch(`${this.API_BASE}/progress/save-progress`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    progressData: this.progress
                })
            });

            console.log('✅ Full sync completed');
        } catch (error) {
            console.log('⚠️ Full sync failed');
        }
    }

    async syncWithBackend() {
        if (!this.isOnline) return;

        // Process any queued items
        await this.processSyncQueue();

        // Also do a full sync for safety
        await this.fullSyncWithBackend();
    }

    // ========== NETWORK HANDLERS ==========
    handleOnline() {
        console.log('🌐 Back online, syncing...');
        this.isOnline = true;
        this.syncWithBackend();
    }

    handleOffline() {
        console.log('📴 Offline, working locally');
        this.isOnline = false;
    }

    // ========== PUBLIC API ==========
    async getProgress() {
        if (!this.progress) {
            await this.loadProgress();
        }
        return this.progress;
    }

    async getLevelProgress(level) {
        await this.getProgress();
        return this.progress?.levels[level] || null;
    }

    async isLevelCompleted(level) {
        const levelProgress = await this.getLevelProgress(level);
        return levelProgress?.status === "completed";
    }

    async isActivityCompleted(level, activity) {
        const levelProgress = await this.getLevelProgress(level);
        return levelProgress?.completedActivities?.includes(activity) || false;
    }

    async getTotalRewards() {
        await this.getProgress();
        return this.progress?.totals || { totalStars: 0, totalBadges: 0, totalTokens: 0 };
    }

    async resetProgress() {
        localStorage.removeItem('arithmo_progress');
        this.progress = null;
        this.syncQueue = [];
        await this.createDefaultProgress();

        // Also reset backend if logged in
        const token = localStorage.getItem('arithmo_jwt');
        if (token) {
            try {
                await fetch(`${this.API_BASE}/progress/save-progress`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        progressData: this.progress
                    })
                });
            } catch (error) {
                console.log('⚠️ Could not reset backend progress');
            }
        }

        return this.progress;
    }

    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            queueLength: this.syncQueue.length,
            lastSync: this.progress?.lastSync
        };
    }
}

// Add debug logging to see what's happening:
async function saveProgress(progressData) {
    try {
        const token = localStorage.getItem('arithmo_jwt');
        console.log('📤 Saving progress to backend...');
        console.log('Token exists:', !!token);
        console.log('URL:', `${this.API_BASE}/progress/save-progress`);
        console.log('Data size:', JSON.stringify(progressData).length);

        const response = await fetch(`${this.API_BASE}/progress/save-progress`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ progressData })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Save successful:', result);
        return result;

    } catch (error) {
        console.error('❌ Save failed:', error);
        // Fallback to local
        this.saveLocalProgress();
        return { success: false, error: error.message, local: true };
    }
}

// Create global instance
window.ArithmoProgress = new ProgressManager();