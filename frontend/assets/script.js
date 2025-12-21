let small_screen_nav_bar_btn = document.querySelector('.small-screen-nav-bar-btn');
let small_screen_nav_bar_links_container = document.querySelector('.small-screen-nav-bar-links-container');

// ---------- Small Screen Nav Bar ---------- //

small_screen_nav_bar_btn.addEventListener('click', function toogleSmallScreenNavBtn() {
    if (small_screen_nav_bar_links_container.style.right != "0px") {
        small_screen_nav_bar_links_container.style.right = "0px";
        small_screen_nav_bar_btn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
        small_screen_nav_bar_btn.style.border = "1px solid #fff";
    } else {
        small_screen_nav_bar_links_container.style.right = "-210px";
        small_screen_nav_bar_btn.innerHTML = `<i class="fa-solid fa-bars"></i>`;
        small_screen_nav_bar_btn.style.border = "none";
    }
});

// ========== PROGRESS MANAGER INTEGRATION ==========
document.addEventListener('DOMContentLoaded', function () {
    // Create global sync status indicator
    if (window.ArithmoProgress) {
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
});