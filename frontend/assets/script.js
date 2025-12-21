// script.js - Simplified version (no mobile menu handling here)
(function () {
    console.log('📜 SCRIPT.JS: Loading...');

    // ========== SYNC INDICATOR (ONLY FOR ROADMAP) ==========
    function setupGlobalSyncIndicator() {
        // Check if we're on roadmap.html
        const isRoadmapPage = window.location.pathname.includes('roadmap.html') ||
            document.title.includes('Math Journey');

        if (!isRoadmapPage) {
            // Remove any existing indicator if we're not on roadmap
            const existingIndicator = document.getElementById('global-sync-status');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            return;
        }

        // Check if progress manager is available
        if (!window.ArithmoProgress) {
            // Try to load it
            const script = document.createElement('script');
            script.src = 'assets/progress-manager.js';
            script.onload = function () {
                if (window.ArithmoProgress) {
                    createSyncIndicator();
                }
            };
            document.head.appendChild(script);
            return;
        }

        // Create indicator if progress manager is already loaded
        createSyncIndicator();
    }

    function createSyncIndicator() {
        // Check if indicator already exists
        if (document.getElementById('global-sync-status')) {
            return;
        }

        const indicator = document.createElement('div');
        indicator.id = 'global-sync-status';
        indicator.style.cssText = `
            position: fixed;
            bottom: 70px;
            right: 20px;
            z-index: 1000;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            gap: 6px;
            pointer-events: none;
            transition: all 0.3s;
        `;
        document.body.appendChild(indicator);

        function updateGlobalSyncStatus() {
            if (!window.ArithmoProgress) return;

            const status = window.ArithmoProgress.getSyncStatus();
            const indicator = document.getElementById('global-sync-status');
            if (!indicator) return;

            if (!status.isOnline) {
                indicator.innerHTML = '📴 Offline';
                indicator.style.background = 'rgba(255, 152, 0, 0.9)';
                indicator.style.color = 'white';
            } else if (status.isSyncing) {
                indicator.innerHTML = '🔄 Syncing...';
                indicator.style.background = 'rgba(33, 150, 243, 0.9)';
                indicator.style.color = 'white';
            } else if (status.queueLength > 0) {
                indicator.innerHTML = `⚠️ ${status.queueLength} pending`;
                indicator.style.background = 'rgba(255, 193, 7, 0.9)';
                indicator.style.color = 'black';
            } else {
                indicator.innerHTML = '✅ Synced';
                indicator.style.background = 'rgba(76, 175, 80, 0.9)';
                indicator.style.color = 'white';
            }
        }

        setInterval(updateGlobalSyncStatus, 5000);
        updateGlobalSyncStatus();
    }

    // ========== NAVBAR SCROLL EFFECT ==========
    function setupNavbarScroll() {
        const navbar = document.getElementById("navbar");

        if (navbar) {
            window.addEventListener("scroll", () => {
                if (window.scrollY > 2) {
                    navbar.classList.add("nav-scrolled");
                } else {
                    navbar.classList.remove("nav-scrolled");
                }
            });
            console.log('✅ SCRIPT.JS: Navbar scroll effect setup');
        }
    }

    // ========== MAIN INITIALIZATION ==========
    document.addEventListener("DOMContentLoaded", function () {
        console.log('📜 SCRIPT.JS: DOM loaded');

        // Setup navbar scroll effect
        setupNavbarScroll();

        // Setup sync indicator (only for roadmap page)
        setupGlobalSyncIndicator();
    });

})();