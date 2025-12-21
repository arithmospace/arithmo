// assets/progress-manager.js - PERMANENT FIX
class ProgressManager {
    constructor() {
        this.baseURL = window.location.origin.includes('localhost')
            ? 'http://localhost:10000'
            : ''; // Use relative path for production
        console.log('🚀 Progress Manager initialized. Base URL:', this.baseURL);
    }

    // ==================== CORE METHODS ====================

    async saveProgress(progressData) {
        console.log('💾 SAVE PROGRESS:', progressData);
        return this._makeRequest('/api/progress/save-progress', 'POST', { progressData });
    }

    async getProgress() {
        console.log('📥 LOAD PROGRESS');
        const result = await this._makeRequest('/api/progress/load-progress', 'GET');
        return result.success ? result.progressData : this.getDefaultProgress();
    }

    async updateActivity(level, activity, rewards = { stars: 0, badges: 0, tokens: 0 }, isCompleted = false) {
        console.log('🔄 UPDATE ACTIVITY:', { level, activity, rewards, isCompleted });
        return this._makeRequest('/api/progress/update-activity', 'POST', {
            level,
            activity,
            rewards,
            isCompleted
        });
    }

    // ==================== INTERNAL METHODS ====================

    async _makeRequest(endpoint, method, data = null) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('❌ No JWT token found in localStorage');
                return { success: false, error: 'Not authenticated' };
            }

            const url = `${this.baseURL}${endpoint}`;
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            console.log(`🌐 ${method} ${url}`, data || '');

            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                console.error(`❌ API Error (${response.status}):`, result);
                return {
                    success: false,
                    error: result.error || `HTTP ${response.status}`,
                    status: response.status
                };
            }

            console.log(`✅ ${method} ${endpoint}: Success`, result);
            return result;

        } catch (error) {
            console.error('💥 Network Error:', error);
            return {
                success: false,
                error: 'Network error - check console for details',
                details: error.message
            };
        }
    }

    // ==================== DEFAULT PROGRESS ====================

    getDefaultProgress() {
        const defaultProgress = {
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
            defaultProgress.levels[i] = {
                status: i === 1 ? "not-started" : "locked",
                completedActivities: [],
                rewards: { stars: 0, badges: 0, tokens: 0 },
                lastActivity: 0,
                startedAt: new Date().toISOString()
            };
        }

        console.log('📄 Created default progress');
        return defaultProgress;
    }

    // ==================== HELPER METHODS ====================

    isAuthenticated() {
        const token = localStorage.getItem('token');
        return !!token;
    }

    getToken() {
        return localStorage.getItem('token');
    }

    clearProgress() {
        localStorage.removeItem('progress');
        console.log('🧹 Progress cleared from localStorage');
    }

    // ==================== DEBUG METHODS ====================

    async testConnection() {
        console.log('🔍 Testing server connection...');
        try {
            const response = await fetch(`${this.baseURL}/api/health`);
            const result = await response.json();
            console.log('✅ Server health:', result);
            return result.status === 'OK';
        } catch (error) {
            console.error('❌ Server health check failed:', error);
            return false;
        }
    }

    async testAuth() {
        console.log('🔐 Testing authentication...');
        const token = this.getToken();
        if (!token) {
            console.error('❌ No token found');
            return false;
        }

        try {
            const result = await this._makeRequest('/api/progress/debug', 'GET');
            console.log('✅ Auth test result:', result);
            return result.success === true;
        } catch (error) {
            console.error('❌ Auth test failed:', error);
            return false;
        }
    }
}

// ==================== GLOBAL SETUP ====================

// Create and expose the manager
window.ArithmoProgress = new ProgressManager();

// Auto-test on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 Page loaded, running auto-tests...');

    // Test 1: Check server
    const serverOk = await window.ArithmoProgress.testConnection();
    console.log(serverOk ? '✅ Server is reachable' : '❌ Server is unreachable');

    // Test 2: Check auth
    const authOk = await window.ArithmoProgress.testAuth();
    console.log(authOk ? '✅ Authentication is working' : '❌ Authentication failed');

    // Test 3: Auto-load progress if authenticated
    if (window.ArithmoProgress.isAuthenticated()) {
        console.log('🔄 Auto-loading progress...');
        const progress = await window.ArithmoProgress.getProgress();
        console.log('📊 Current progress loaded:', progress);
    }
});

console.log('🎯 Progress Manager READY - Use window.ArithmoProgress');