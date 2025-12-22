(function () {
    'use strict';

    // Check if already exists
    if (window.ArithmoProgress) {
        console.log('⚠️ Progress Manager already initialized, skipping...');
        return;
    }

    /**
     * ARITHMO PROGRESS MANAGER - ENHANCED VERSION
     * Backend-first approach with persistent sync queue
     */

    class ProgressManager {
        constructor() {
            this.API_BASE = 'https://arithmobackend.onrender.com/api';
            this.progress = null;
            this.syncQueue = [];
            this.isOnline = navigator.onLine;
            this.isSyncing = false;
            this.retryAttempts = {};
            this.MAX_RETRIES = 5;
            this.RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

            this.init();
        }

        /**
 * Check if JWT token is about to expire and refresh it
 */
        async checkAndRefreshToken() {
            const token = localStorage.getItem('arithmo_jwt');

            if (!token) {
                return false;
            }

            try {
                // Decode token to check expiry (without verifying signature)
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expiryTime = payload.exp * 1000; // Convert to milliseconds
                const currentTime = Date.now();
                const timeUntilExpiry = expiryTime - currentTime;

                // If less than 1 day (86400000 ms) until expiry, refresh
                if (timeUntilExpiry < 86400000) {
                    console.log('🔄 Token expiring soon, refreshing...');

                    const response = await fetch(`${this.API_BASE}/auth/refresh-token`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();

                        if (data.success) {
                            // Update stored token
                            localStorage.setItem('arithmo_jwt', data.token);

                            // Update user data
                            localStorage.setItem('arithmo_user', JSON.stringify({
                                username: data.username,
                                userId: data.userId
                            }));

                            console.log('✅ Token refreshed successfully');
                            return true;
                        } else {
                            console.error('❌ Token refresh failed:', data.error);
                            return false;
                        }
                    } else {
                        console.error('❌ Token refresh HTTP error:', response.status);
                        return false;
                    }
                }

                return true; // Token still valid

            } catch (error) {
                console.error('❌ Token check error:', error);
                return false;
            }
        }

        async init() {
            console.log('🔧 Progress Manager Initializing (Enhanced)...');

            // Load sync queue from localStorage
            this.loadSyncQueue();

            // Setup online/offline detection
            window.addEventListener('online', () => this.handleOnline());
            window.addEventListener('offline', () => this.handleOffline());

            // ✅ CHECK AND REFRESH TOKEN
            await this.checkAndRefreshToken();

            // Try to load progress from backend
            await this.loadProgress();

            // Process any queued items
            if (this.syncQueue.length > 0) {
                console.log(`📋 Found ${this.syncQueue.length} queued items, processing...`);
                await this.processSyncQueue();
            }

            // Auto-save before page closes
            window.addEventListener('beforeunload', () => {
                this.saveSyncQueue();
            });

            // Periodic sync check (every 2 minutes)
            setInterval(() => {
                if (this.isOnline && this.syncQueue.length > 0) {
                    this.processSyncQueue();
                }
            }, 120000);

            // ✅ AUTO-REFRESH TOKEN CHECK (every 1 hour)
            setInterval(() => {
                this.checkAndRefreshToken();
            }, 3600000); // Check every hour

            console.log('✅ Progress Manager Ready (Enhanced)');
        }

        // ==================== CORE PROGRESS OPERATIONS ====================

        /**
         * Load progress from backend (source of truth)
         */
        async loadProgress() {
            const token = localStorage.getItem('arithmo_jwt');

            if (!token) {
                console.log('⚠️ No JWT token, using localStorage only');
                this.loadLocalProgress();
                if (!this.progress) {
                    this.createDefaultProgress();
                }
                return this.progress;
            }

            try {
                console.log('📥 Loading progress from backend...');

                const response = await fetch(`${this.API_BASE}/progress/load-progress`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.success) {
                        this.progress = data.progressData;
                        this.saveLocalProgress(); // Cache it
                        console.log('✅ Progress loaded from backend');
                        return this.progress;
                    }
                }

                // Fallback to localStorage
                console.log('⚠️ Backend load failed, using localStorage');
                this.loadLocalProgress();

            } catch (error) {
                console.log('❌ Backend unreachable, using localStorage');
                this.loadLocalProgress();
            }

            // Create default if nothing exists
            if (!this.progress) {
                this.createDefaultProgress();
            }

            return this.progress;
        }

        /**
         * Save activity progress (BACKEND FIRST)
         */
        async saveActivityProgress(level, activity, rewards = {}, isCompleted = false) {
            console.log(`💾 Saving activity: Level ${level}, Activity ${activity}`);

            const token = localStorage.getItem('arithmo_jwt');

            // If no token, only save locally
            if (!token) {
                console.warn('⚠️ No token, saving locally only');
                this.updateLocalProgress(level, activity, rewards, isCompleted);
                this.saveLocalProgress();

                // ✅ SHOW TOAST
                if (window.ArithmoToast) {
                    window.ArithmoToast.warning('Progress saved locally only. Login to sync!', 5000);
                }

                return { success: true, local: true };
            }

            // Try backend save first
            try {
                const response = await fetch(`${this.API_BASE}/progress/update-activity`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        level,
                        activity,
                        rewards,
                        isCompleted
                    }),
                    timeout: 30000
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.success) {
                        // Backend save succeeded
                        this.progress = data.progressData;
                        this.saveLocalProgress();
                        console.log('✅ Activity saved to backend');

                        // ✅ SHOW SUCCESS TOAST
                        if (window.ArithmoToast) {
                            const rewardText = [];
                            if (rewards.stars) rewardText.push(`+${rewards.stars} ⭐`);
                            if (rewards.tokens) rewardText.push(`+${rewards.tokens} 🎨`);
                            if (rewards.badges) rewardText.push(`+${rewards.badges} 🏅`);

                            window.ArithmoToast.success(
                                `Activity ${activity} completed! ${rewardText.join(', ')}`,
                                3000
                            );
                        }

                        return { success: true, backend: true };
                    }
                }

                // Backend save failed
                throw new Error(`Backend returned ${response.status}`);

            } catch (error) {
                console.error('❌ Backend save failed:', error.message);

                // Update local cache immediately
                this.updateLocalProgress(level, activity, rewards, isCompleted);
                this.saveLocalProgress();

                // Queue for retry
                this.queueForSync({ level, activity, rewards, isCompleted });

                // ✅ SHOW WARNING TOAST
                if (window.ArithmoToast) {
                    window.ArithmoToast.warning(
                        'Progress saved locally. Will sync when online.',
                        4000
                    );
                }

                return {
                    success: true,
                    local: true,
                    queued: true,
                    error: error.message
                };
            }
        }

        /**
         * Force sync - manually trigger backend save
         */
        async forceSync() {
            const token = localStorage.getItem('arithmo_jwt');

            if (!token) {
                return {
                    success: false,
                    error: 'Not authenticated'
                };
            }

            if (!this.progress) {
                return {
                    success: false,
                    error: 'No progress to sync'
                };
            }

            console.log('🔄 Force sync requested...');

            try {
                const response = await fetch(`${this.API_BASE}/progress/force-sync`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        progressData: this.progress
                    })
                });

                const data = await response.json();

                if (response.status === 409) {
                    // Conflict detected
                    console.warn('⚠️ Sync conflict detected');
                    return {
                        success: false,
                        conflict: true,
                        backendData: data.backendData,
                        localData: this.progress
                    };
                }

                if (response.ok && data.success) {
                    console.log('✅ Force sync completed');
                    this.progress = data.progressData;
                    this.saveLocalProgress();
                    return { success: true };
                }

                throw new Error(data.error || 'Sync failed');

            } catch (error) {
                console.error('❌ Force sync failed:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // ==================== LOCAL STORAGE OPERATIONS ====================

        loadLocalProgress() {
            try {
                const saved = localStorage.getItem('arithmo_progress');
                if (saved) {
                    this.progress = JSON.parse(saved);
                    console.log('📂 Progress loaded from localStorage');
                }
            } catch (error) {
                console.error('❌ Error loading from localStorage:', error);
            }
        }

        saveLocalProgress() {
            try {
                localStorage.setItem('arithmo_progress', JSON.stringify(this.progress));
            } catch (error) {
                console.error('❌ Error saving to localStorage:', error);
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
                    lastActivity: 0,
                    startedAt: new Date().toISOString()
                };
            }

            this.saveLocalProgress();
        }

        updateLocalProgress(level, activity, rewards, isCompleted) {
            if (!this.progress) {
                this.createDefaultProgress();
            }

            // Ensure level exists
            if (!this.progress.levels[level]) {
                this.progress.levels[level] = {
                    status: "in-progress",
                    completedActivities: [],
                    rewards: { stars: 0, badges: 0, tokens: 0 },
                    lastActivity: 0,
                    startedAt: new Date().toISOString()
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

            // Unlock next level if completed
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

        // ==================== SYNC QUEUE MANAGEMENT ====================

        loadSyncQueue() {
            try {
                const saved = localStorage.getItem('arithmo_sync_queue');
                if (saved) {
                    this.syncQueue = JSON.parse(saved);
                    console.log(`📋 Loaded ${this.syncQueue.length} items from sync queue`);
                }
            } catch (error) {
                console.error('❌ Error loading sync queue:', error);
                this.syncQueue = [];
            }
        }

        saveSyncQueue() {
            try {
                localStorage.setItem('arithmo_sync_queue', JSON.stringify(this.syncQueue));
            } catch (error) {
                console.error('❌ Error saving sync queue:', error);
            }
        }

        queueForSync(item) {
            const queueItem = {
                ...item,
                timestamp: Date.now(),
                id: `${item.level}-${item.activity}-${Date.now()}`
            };

            this.syncQueue.push(queueItem);
            this.saveSyncQueue();

            console.log(`📌 Queued for sync: Level ${item.level}, Activity ${item.activity}`);
        }

        async processSyncQueue() {
            if (this.isSyncing || this.syncQueue.length === 0 || !this.isOnline) {
                return;
            }

            this.isSyncing = true;
            const token = localStorage.getItem('arithmo_jwt');

            if (!token) {
                console.log('⚠️ No token, cannot process sync queue');
                this.isSyncing = false;
                return;
            }

            console.log(`🔄 Processing sync queue (${this.syncQueue.length} items)...`);

            // ✅ SHOW SYNCING TOAST
            let syncToast = null;
            if (window.ArithmoToast) {
                syncToast = window.ArithmoToast.info(
                    `Syncing ${this.syncQueue.length} activities...`,
                    60000 // Long duration
                );
            }

            let successCount = 0;
            let failCount = 0;

            while (this.syncQueue.length > 0) {
                const item = this.syncQueue[0];
                const itemId = item.id;

                // Check retry attempts
                if (!this.retryAttempts[itemId]) {
                    this.retryAttempts[itemId] = 0;
                }

                if (this.retryAttempts[itemId] >= this.MAX_RETRIES) {
                    console.warn(`⚠️ Max retries reached for ${itemId}, removing`);
                    this.syncQueue.shift();
                    delete this.retryAttempts[itemId];
                    this.saveSyncQueue();
                    failCount++;
                    continue;
                }

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
                        const data = await response.json();

                        if (data.success) {
                            // Success!
                            this.syncQueue.shift();
                            delete this.retryAttempts[itemId];
                            this.saveSyncQueue();
                            this.progress = data.progressData;
                            this.saveLocalProgress();
                            successCount++;
                            console.log(`✅ Synced: Level ${item.level}, Activity ${item.activity}`);
                        } else {
                            throw new Error(data.error || 'Sync failed');
                        }
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }

                } catch (error) {
                    console.warn(`⚠️ Sync failed for ${itemId}: ${error.message}`);
                    this.retryAttempts[itemId]++;
                    const delay = this.RETRY_DELAYS[this.retryAttempts[itemId] - 1] || 16000;
                    await new Promise(resolve => setTimeout(resolve, delay));

                    if (this.retryAttempts[itemId] < this.MAX_RETRIES) {
                        const failedItem = this.syncQueue.shift();
                        this.syncQueue.push(failedItem);
                        this.saveSyncQueue();
                    }

                    failCount++;
                    break;
                }
            }

            this.isSyncing = false;

            // ✅ REMOVE SYNCING TOAST AND SHOW RESULT
            if (window.ArithmoToast && syncToast) {
                window.ArithmoToast.remove(syncToast);

                if (successCount > 0) {
                    window.ArithmoToast.success(
                        `✅ Synced ${successCount} activity${successCount > 1 ? 's' : ''}!`,
                        3000
                    );
                }

                if (failCount > 0 && this.syncQueue.length === 0) {
                    window.ArithmoToast.error(
                        `❌ ${failCount} activities failed to sync`,
                        5000
                    );
                }
            }

            if (this.syncQueue.length === 0) {
                console.log('✅ Sync queue cleared!');
            }
        }

        // ==================== NETWORK HANDLERS ====================

        handleOnline() {
            console.log('🌐 Back online!');
            this.isOnline = true;

            // Process queued items
            if (this.syncQueue.length > 0) {
                console.log(`📋 Found ${this.syncQueue.length} queued items, syncing...`);
                this.processSyncQueue();
            }
        }

        handleOffline() {
            console.log('🔴 Offline mode');
            this.isOnline = false;
        }

        // ==================== PUBLIC API ====================

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
            return this.progress?.totals || {
                totalStars: 0,
                totalBadges: 0,
                totalTokens: 0
            };
        }

        getSyncStatus() {
            return {
                isOnline: this.isOnline,
                isSyncing: this.isSyncing,
                queueLength: this.syncQueue.length,
                lastSync: this.progress?.lastSync,
                hasToken: !!localStorage.getItem('arithmo_jwt')
            };
        }

        async resetProgress() {
            localStorage.removeItem('arithmo_progress');
            localStorage.removeItem('arithmo_sync_queue');
            this.progress = null;
            this.syncQueue = [];
            this.retryAttempts = {};

            await this.createDefaultProgress();

            // Reset backend if logged in
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
                    console.log('✅ Backend progress reset');
                } catch (error) {
                    console.log('⚠️ Could not reset backend progress');
                }
            }

            return this.progress;
        }

        isAuthenticated() {
            return !!localStorage.getItem('arithmo_jwt');
        }
    }

    // Create global instance
    window.ArithmoProgress = new ProgressManager();
    console.log('✅ Enhanced Progress Manager Initialized');
})();