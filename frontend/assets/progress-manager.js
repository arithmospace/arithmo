(function () {
    'use strict';

    if (window.ArithmoProgress) return;

    class ProgressManager {
        constructor() {
            this.API_BASE = 'https://arithmobackend.onrender.com/api';
            this.progress = null;
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

            const token = localStorage.getItem('arithmo_jwt');
            if (token) {
                await this.loadProgress();
            } else {
                this.loadLocalProgress();
            }
            this.initialized = true;
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
                        this.saveLocalProgress();
                        // ✅ FIX: REMOVED THE TOAST NOTIFICATION HERE
                        console.log('✅ Progress synced silently');
                    }
                }
            } catch (err) {
                console.error('Backend load failed:', err);
                this.loadLocalProgress();
            }
        }

        async saveActivityProgress(level, activity, rewards = {}, isCompleted = false) {
            this.updateLocalState(level, activity, rewards, isCompleted);
            const token = localStorage.getItem('arithmo_jwt');

            if (!token) {
                return { success: true, savedLocally: true };
            }

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

                if (response.ok && data.success) {
                    this.progress = data.progressData;
                    this.saveLocalProgress();
                    return { success: true };
                } else {
                    return { success: false, error: data.error };
                }
            } catch (err) {
                return { success: true, error: err.message, savedLocally: true };
            }
        }

        async resetProgress() {
            this.progress = this.createDefault();
            this.saveLocalProgress();

            const token = localStorage.getItem('arithmo_jwt');
            if (!token) return { success: true };

            try {
                const response = await fetch(`${this.API_BASE}/progress/reset`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                return data;
            } catch (err) {
                console.error('Reset failed:', err);
                return { success: false, error: 'Network error' };
            }
        }

        updateLocalState(level, activity, rewards, isCompleted) {
            if (!this.progress) this.progress = this.createDefault();

            if (!this.progress.totals) this.progress.totals = { totalStars: 0, totalBadges: 0, totalTokens: 0 };

            if (!this.progress.levels[level]) {
                this.progress.levels[level] = { completedActivities: [], rewards: { stars: 0, badges: 0, tokens: 0 } };
            }

            const lvl = this.progress.levels[level];

            if (!lvl.completedActivities.includes(activity)) {
                this.progress.totals.totalStars = (this.progress.totals.totalStars || 0) + (rewards.stars || 0);
                this.progress.totals.totalBadges = (this.progress.totals.totalBadges || 0) + (rewards.badges || 0);
                this.progress.totals.totalTokens = (this.progress.totals.totalTokens || 0) + (rewards.tokens || 0);

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
            return { levels: {}, totals: { totalStars: 0, totalBadges: 0, totalTokens: 0 } };
        }

        async isLevelUnlocked(level) {
            if (level === 1) return true;
            if (!this.progress) {
                await this.ready();
                if (!this.progress) await this.loadProgress();
            }
            if (!this.progress) return false;
            const prev = this.progress.levels && this.progress.levels[level - 1];
            return prev && prev.status === 'completed';
        }

        async ready() {
            if (this.initialized) return true;
            return new Promise(resolve => {
                window.addEventListener('ArithmoProgressReady', () => resolve(true), { once: true });
            });
        }

        getProgress() { return this.progress; }
        getSyncStatus() { return { isOnline: this.isOnline, hasToken: this.isAuthenticated() }; }
        handleOnline() { this.isOnline = true; this.loadProgress(); }
        handleOffline() { this.isOnline = false; }
    }

    window.ArithmoProgress = new ProgressManager();
})();