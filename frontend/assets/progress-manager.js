(function () {
    'use strict';

    if (window.ArithmoProgress) return;

    class ProgressManager {
        constructor() {
            // REPLACE THIS WITH YOUR RENDER URL
            this.API_BASE = 'https://arithmobackend.onrender.com/api';
            this.progress = null;
            this.syncQueue = [];
            this.isOnline = navigator.onLine;
            this.initialized = false;

            this.init();
        }

        isAuthenticated() {
            return !!localStorage.getItem('arithmo_jwt');
        }

        async init() {
            console.log('🔧 Progress Manager Initializing...');

            window.addEventListener('online', () => this.handleOnline());
            window.addEventListener('offline', () => this.handleOffline());

            // 1. Check Authentication
            const token = localStorage.getItem('arithmo_jwt');

            if (token) {
                // 2. If logged in, load from Backend
                await this.loadProgress();
            } else {
                console.warn('⚠️ User not logged in. Progress will be local only.');
                this.loadLocalProgress();
            }

            this.initialized = true;
            // Dispatch event for other scripts to know we are ready
            window.dispatchEvent(new CustomEvent('ArithmoProgressReady'));
        }

        async loadProgress() {
            if (!this.isOnline) {
                this.loadLocalProgress();
                return;
            }

            try {
                const token = localStorage.getItem('arithmo_jwt');
                const response = await fetch(`${this.API_BASE}/progress/load-progress`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.progress = data.progressData;
                        this.saveLocalProgress(); // Update cache
                        console.log('✅ Progress synced from Backend');
                    }
                } else {
                    if (response.status === 401 || response.status === 403) {
                        // Token invalid
                        localStorage.removeItem('arithmo_jwt');
                        window.location.href = '../arithmo-login.html';
                    }
                }
            } catch (err) {
                console.error('Backend load failed:', err);
                this.loadLocalProgress(); // Fallback
            }
        }

        async saveActivityProgress(level, activity, rewards = {}, isCompleted = false) {
            // Update Local Memory First (Optimistic UI)
            this.updateLocalState(level, activity, rewards, isCompleted);

            const token = localStorage.getItem('arithmo_jwt');
            if (!token) return { success: false, error: 'Not logged in' };

            try {
                const response = await fetch(`${this.API_BASE}/progress/update-activity`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ level, activity, rewards, isCompleted })
                });

                const data = await response.json();
                if (data.success) {
                    this.progress = data.progressData; // Sync full state
                    this.saveLocalProgress();
                    return { success: true };
                }
            } catch (err) {
                console.error('Save failed, queueing...', err);
                // Queue logic can go here (omitted for brevity, focus on core save)
            }
        }

        // Helper to update state in memory immediately
        updateLocalState(level, activity, rewards, isCompleted) {
            if (!this.progress) this.progress = this.createDefault();

            // Ensure level exists
            if (!this.progress.levels[level]) {
                this.progress.levels[level] = { completedActivities: [], rewards: { stars: 0, badges: 0, tokens: 0 } };
            }

            const lvl = this.progress.levels[level];
            if (!lvl.completedActivities.includes(activity)) {
                lvl.completedActivities.push(activity);
            }

            if (isCompleted) lvl.status = 'completed';

            this.saveLocalProgress();
        }

        loadLocalProgress() {
            const saved = localStorage.getItem('arithmo_progress');
            if (saved) this.progress = JSON.parse(saved);
        }

        saveLocalProgress() {
            localStorage.setItem('arithmo_progress', JSON.stringify(this.progress));
        }

        createDefault() {
            return { levels: {}, totals: {} };
        }

        // Helper for Levels
        async isLevelUnlocked(level) {
            if (level === 1) return true;
            if (!this.progress) await this.loadProgress();

            // Check if previous level is completed
            const prev = this.progress?.levels?.[level - 1];
            return prev && prev.status === 'completed';
        }

        // Wait for init
        async ready() {
            if (this.initialized) return true;
            return new Promise(resolve => {
                window.addEventListener('ArithmoProgressReady', () => resolve(true), { once: true });
            });
        }

        getProgress() {
            return this.progress;
        }

        getSyncStatus() {
            return { isOnline: this.isOnline, hasToken: this.isAuthenticated() };
        }
    }

    window.ArithmoProgress = new ProgressManager();
})();