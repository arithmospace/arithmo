// ========== COMPLETE ACTIVITY HANDLER ==========
async function completeActivity(level, activityNumber, rewards = { stars: 1, badges: 0, tokens: 10 }) {
    console.log(`🎯 Completing activity ${activityNumber} on level ${level}`);

    if (!window.ArithmoProgress) return false;
    await window.ArithmoProgress.ready();

    // REMOVED: The check that forced login (isAuthenticated)
    // Now guests can proceed!

    // Call save
    const result = await window.ArithmoProgress.saveActivityProgress(
        level,
        activityNumber,
        rewards,
        false
    );

    if (result && result.success) {
        if (window.ArithmoToast) {
            window.ArithmoToast.success(`Activity ${activityNumber} Completed! +${rewards.stars} ⭐`);
        }
        return true;
    } else {
        console.error('Failed to save:', result ? result.error : 'Unknown error');
        return false;
    }
}

// ========== COMPLETE LEVEL HANDLER ==========
async function completeLevel(level) {
    if (!level) {
        const match = window.location.pathname.match(/level-(\d+)/);
        level = match ? parseInt(match[1]) : 1;
    }

    console.log(`🏆 Completing Level ${level}`);

    if (window.ArithmoProgress) await window.ArithmoProgress.ready();

    if (!level) {
        alert("Error: Could not determine current level.");
        return false;
    }

    const result = await window.ArithmoProgress.saveActivityProgress(
        level,
        10,
        { stars: 50, badges: 1, tokens: 100 },
        true // MARK LEVEL AS COMPLETED
    );

    if (result && result.success) {
        alert(`🎉 LEVEL ${level} COMPLETED!\n\n🎖️ Earned:\n• 50 ⭐ Stars\n• 1 🏅 Badge\n• 100 🎨 Tokens`);
        setTimeout(() => {
            window.location.href = '../roadmap.html';
        }, 1000);
        return true;
    } else {
        console.error("Level completion failed:", result);
        alert('Could not save level completion. Please check console for details.');
        return false;
    }
}

// ========== AUTO-UPDATE UI ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.ArithmoProgress) return;
    await window.ArithmoProgress.ready();
    const progress = window.ArithmoProgress.getProgress();
    if (progress) updateActivityUI(progress);
});

function updateActivityUI(progress) {
    const match = window.location.pathname.match(/level-(\d+)/);
    const currentLevel = match ? parseInt(match[1]) : 1;

    if (progress.levels && progress.levels[currentLevel]) {
        const completed = progress.levels[currentLevel].completedActivities || [];
        completed.forEach(activityNum => {
            const btn = document.querySelector(`[data-activity="${activityNum}"]`);
            if (btn) {
                btn.innerHTML = '✓ ' + btn.textContent;
                btn.classList.add('completed-activity-btn');
                btn.disabled = true;
            }
        });
    }
}