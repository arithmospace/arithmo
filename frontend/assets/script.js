(function () {
    console.log('📜 SCRIPT.JS: Loading...');

    // ========== SYNC INDICATOR ==========
    function setupGlobalSyncIndicator() {
        const isRoadmapOrLevel = window.location.pathname.includes('roadmap.html') ||
            window.location.pathname.includes('level-');

        if (!isRoadmapOrLevel) return;

        // Wait for manager to exist
        const checkInterval = setInterval(() => {
            if (window.ArithmoProgress) {
                clearInterval(checkInterval);
                createSyncIndicator();
            }
        }, 500);
    }

    function createSyncIndicator() {
        if (document.getElementById('global-sync-status')) return;

        const indicator = document.createElement('div');
        indicator.id = 'global-sync-status';
        // Styling matches your previous design
        indicator.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 9999;
            padding: 8px 12px; border-radius: 20px; font-size: 12px;
            font-weight: bold; backdrop-filter: blur(10px);
            display: flex; align-items: center; gap: 6px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: all 0.3s; opacity: 0;
        `;
        document.body.appendChild(indicator);

        setInterval(updateGlobalSyncStatus, 2000); // Check every 2s
    }

    function updateGlobalSyncStatus() {
        if (!window.ArithmoProgress) return;

        const status = window.ArithmoProgress.getSyncStatus();
        const indicator = document.getElementById('global-sync-status');
        if (!indicator) return;

        indicator.style.opacity = '1';

        if (!status.isOnline) {
            indicator.innerHTML = '📴 Offline Mode';
            indicator.style.background = 'rgba(255, 152, 0, 0.9)'; // Orange
            indicator.style.color = 'white';
        } else if (!status.hasToken) {
            indicator.innerHTML = '⚠️ Not Logged In';
            indicator.style.background = 'rgba(100, 100, 100, 0.9)'; // Grey
            indicator.style.color = 'white';
        } else {
            indicator.innerHTML = '✅ Progress Saved';
            indicator.style.background = 'rgba(76, 175, 80, 0.9)'; // Green
            indicator.style.color = 'white';

            // Fade out if everything is good to not distract
            setTimeout(() => { indicator.style.opacity = '0.5'; }, 1000);
        }
    }

    // ========== NAVBAR SCROLL ==========
    function setupNavbarScroll() {
        const navbar = document.getElementById("navbar");
        if (navbar) {
            window.addEventListener("scroll", () => {
                if (window.scrollY > 2) navbar.classList.add("nav-scrolled");
                else navbar.classList.remove("nav-scrolled");
            });
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        setupNavbarScroll();
        setupGlobalSyncIndicator();
    });

})();