(async function () {
    console.log("🛡️ Checking Level Access...");

    // REMOVED: The mandatory login check. 
    // Guests are now allowed to play! 
    // Progress Manager handles local storage for them.

    // 1. Wait for Progress Manager to exist
    let attempts = 0;
    while (!window.ArithmoProgress && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }

    if (!window.ArithmoProgress) {
        console.error("Progress Manager failed to load.");
        return;
    }

    // 2. Ensure Progress is Loaded (Loads from LocalStorage for Guests)
    await window.ArithmoProgress.ready();

    // 3. Check Level Lock
    // Extract level number from filename (e.g., level-2.html -> 2)
    const match = window.location.pathname.match(/level-(\d+)/);
    const currentLevel = match ? parseInt(match[1]) : 1;

    // Only check locks for Level 2 and up
    if (currentLevel > 1) {
        const isUnlocked = await window.ArithmoProgress.isLevelUnlocked(currentLevel);

        if (!isUnlocked) {
            console.warn(`🔒 Level ${currentLevel} is locked.`);
            // This alert is fine because it's a legitimate game rule, not a login block
            alert(`Level ${currentLevel} is locked! Complete the previous levels first.`);
            window.location.href = "../roadmap.html";
        } else {
            console.log(`🔓 Level ${currentLevel} access granted.`);
        }
    }
})();