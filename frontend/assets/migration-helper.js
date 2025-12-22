/**
 * ARITHMO PROGRESS MIGRATION HELPER
 * Migrates localStorage progress to backend on login
 */

(function () {
    'use strict';

    class MigrationHelper {
        constructor() {
            this.API_BASE = 'https://arithmobackend.onrender.com/api';
        }

        /**
         * Check if user has old localStorage progress that needs migration
         */
        hasLocalProgressToMigrate() {
            const localProgress = localStorage.getItem('arithmo_progress');
            const token = localStorage.getItem('arithmo_jwt');

            return !!(localProgress && token);
        }

        /**
         * Migrate localStorage progress to backend
         */
        async migrateToBackend() {
            const token = localStorage.getItem('arithmo_jwt');

            if (!token) {
                console.log('⚠️ No token, cannot migrate');
                return { success: false, error: 'Not authenticated' };
            }

            const localProgress = localStorage.getItem('arithmo_progress');

            if (!localProgress) {
                console.log('ℹ️ No local progress to migrate');
                return { success: true, migrated: false };
            }

            try {
                const progressData = JSON.parse(localProgress);

                console.log('🔄 Migrating local progress to backend...');

                const response = await fetch(`${this.API_BASE}/progress/save-progress`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        progressData: progressData
                    })
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.success) {
                        console.log('✅ Migration successful!');

                        // Show success message
                        if (window.ArithmoToast) {
                            window.ArithmoToast.success(
                                '✅ Your progress has been saved to the cloud!',
                                5000
                            );
                        }

                        return { success: true, migrated: true };
                    }
                }

                throw new Error('Migration failed');

            } catch (error) {
                console.error('❌ Migration error:', error);

                if (window.ArithmoToast) {
                    window.ArithmoToast.error(
                        'Failed to sync progress. Will retry later.',
                        5000
                    );
                }

                return { success: false, error: error.message };
            }
        }

        /**
         * Auto-check and migrate on page load
         */
        async autoMigrate() {
            if (this.hasLocalProgressToMigrate()) {
                console.log('📦 Found local progress, attempting migration...');
                const result = await this.migrateToBackend();

                if (result.success && result.migrated) {
                    // Mark as migrated (optional flag)
                    localStorage.setItem('arithmo_migrated', 'true');
                }

                return result;
            }

            return { success: true, migrated: false };
        }
    }

    // Create global instance
    window.ArithmoMigration = new MigrationHelper();
    console.log('✅ Migration Helper Ready');
})();