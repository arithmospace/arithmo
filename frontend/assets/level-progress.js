async function completeActivity(level, activityNumber, rewards = { stars: 1, badges: 0, tokens: 10 }) {
    console.log(`🎯 Completing activity ${activityNumber} on level ${level}`);

    if (!window.ArithmoProgress) {
        alert('Progress system not loaded. Please refresh.');
        return;
    }

    if (!window.ArithmoProgress.isAuthenticated()) {
        alert('Please login to save progress!');
        window.location.href = 'login.html';
        return;
    }

    try {
        // Show loading
        const result = await window.ArithmoProgress.updateActivity(
            level,
            activityNumber,
            rewards,
            false // isCompleted will be set by backend
        );

        if (result.success) {
            // Show success animation
            alert(`✅ Activity ${activityNumber} completed! +${rewards.stars} ⭐`);

            // Optional: Show rewards animation
            if (rewards.stars > 0) {
                console.log(`✨ Earned ${rewards.stars} stars`);
            }

            return true;
        } else {
            console.error('Failed to save:', result.error);
            alert('⚠️ Progress not saved: ' + result.error);
            return false;
        }
    } catch (error) {
        console.error('Error completing activity:', error);
        alert('❌ Network error. Progress not saved.');
        return false;
    }
}

// ========== COMPLETE LEVEL HANDLER ==========
async function completeLevel(level) {
    console.log(`🏆 Completing level ${level}`);

    try {
        const result = await window.ArithmoProgress.updateActivity(
            level,
            10, // Last activity number
            { stars: 50, badges: 1, tokens: 100 }, // Level completion bonus
            true // Mark level as completed
        );

        if (result.success) {
            // Show celebration
            alert(`🎉 LEVEL ${level} COMPLETED!\n\n🎖️ Earned:\n• 50 ⭐ Stars\n• 1 🏅 Badge\n• 100 🎨 Tokens`);

            // Redirect back to roadmap
            setTimeout(() => {
                window.location.href = 'roadmap.html';
            }, 2000);

            return true;
        } else {
            console.error('Level completion failed:', result);
            return false;
        }
    } catch (error) {
        console.error('Error completing level:', error);
        return false;
    }
}

// ========== AUTO-CHECK ON PAGE LOAD ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log(`📚 Level page loaded`);

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('⚠️ No token - progress won\'t be saved');
        // Optional: Show warning to user
    } else {
        console.log('✅ User is authenticated');

        // Auto-load current progress
        const progress = await window.ArithmoProgress.getProgress();
        console.log('📊 Current progress:', progress);

        // Update UI based on already completed activities
        updateActivityUI(progress);
    }
});

function updateActivityUI(progress) {
    // This function should update your activity buttons to show completed status
    // Example: Mark completed activities with checkmarks
    const currentLevel = getCurrentLevelFromURL(); // You need to implement this
    if (progress.levels && progress.levels[currentLevel]) {
        const completed = progress.levels[currentLevel].completedActivities || [];
        completed.forEach(activityNum => {
            const btn = document.querySelector(`[data-activity="${activityNum}"]`);
            if (btn) {
                btn.innerHTML = '✓ ' + btn.textContent;
                btn.style.backgroundColor = '#10b981';
                btn.disabled = true;
            }
        });
    }
}