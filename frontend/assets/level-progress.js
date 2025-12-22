// ========== COMPLETE ACTIVITY HANDLER ==========
async function completeActivity(level, activityNumber, rewards = { stars: 1, badges: 0, tokens: 10 }) {
    console.log(`🎯 Completing activity ${activityNumber} on level ${level}`);

    if (!window.ArithmoProgress) {
        console.error('Progress system not loaded.');
        return false;
    }

    // Wait for system to be ready
    await window.ArithmoProgress.ready();

    if (!window.ArithmoProgress.isAuthenticated()) {
        alert('Please login to save your progress!');
        window.location.href = '../arithmo-login.html'; // Fixed path
        return false;
    }

    try {
        // Use the NEW method name: saveActivityProgress
        const result = await window.ArithmoProgress.saveActivityProgress(
            level,
            activityNumber,
            rewards,
            false // isCompleted (level completion) is false for normal activities
        );

        if (result.success) {
            // Show success toast if available
            if (window.ArithmoToast) {
                window.ArithmoToast.success(`Activity ${activityNumber} Completed! +${rewards.stars} ⭐`);
            }
            return true;
        } else {
            console.error('Failed to save:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Error completing activity:', error);
        return false;
    }
}

// ========== COMPLETE LEVEL HANDLER ==========
async function completeLevel(level) {
    console.log(`🏆 Completing Level ${level}`);

    // Wait for system
    if (window.ArithmoProgress) await window.ArithmoProgress.ready();

    try {
        // Mark level as completed (isCompleted = true)
        // We use activity '10' as the trigger for level completion usually
        const result = await window.ArithmoProgress.saveActivityProgress(
            level,
            10,
            { stars: 50, badges: 1, tokens: 100 }, // Completion Bonus
            true // MARK LEVEL AS COMPLETED
        );

        if (result.success) {
            alert(`🎉 LEVEL ${level} COMPLETED!\n\n🎖️ Earned:\n• 50 ⭐ Stars\n• 1 🏅 Badge\n• 100 🎨 Tokens`);

            // Redirect to roadmap after short delay
            setTimeout(() => {
                window.location.href = '../roadmap.html';
            }, 1000);
            return true;
        } else {
            alert('Could not save level completion. Please check your connection.');
            return false;
        }
    } catch (error) {
        console.error('Error completing level:', error);
        return false;
    }
}

// ========== AUTO-UPDATE UI ==========
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for progress manager
    if (!window.ArithmoProgress) return;

    await window.ArithmoProgress.ready();
    const progress = window.ArithmoProgress.getProgress();

    if (progress) {
        updateActivityUI(progress);
    }
});

function updateActivityUI(progress) {
    // Determine level from URL
    const match = window.location.pathname.match(/level-(\d+)/);
    const currentLevel = match ? parseInt(match[1]) : 1;

    if (progress.levels && progress.levels[currentLevel]) {
        const completed = progress.levels[currentLevel].completedActivities || [];

        // Visually mark buttons as done
        completed.forEach(activityNum => {
            const btn = document.querySelector(`[data-activity="${activityNum}"]`);
            if (btn) {
                btn.innerHTML = '✓ ' + btn.textContent;
                btn.classList.add('completed-activity-btn'); // Use CSS class instead of inline styles
                btn.disabled = true;
            }
        });
    }
}