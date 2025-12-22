// level-guard.js
(async function () {
    console.log("🛡️ Checking Level Access...");

    // 1. Check Login
    const token = localStorage.getItem('arithmo_jwt');
    if (!token) {
        alert("Please login to play!");
        window.location.href = "../arithmo-login.html";
        return;
    }

    // 2. Wait for Progress Manager
    let attempts = 0;
    while (!window.ArithmoProgress && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }

    if (!window.ArithmoProgress) {
        console.error("Progress Manager failed to load.");
        return;
    }

    // 3. Ensure Progress is Loaded
    await window.ArithmoProgress.ready();

    // 4. Check Level Lock
    // Extract level number from filename (e.g., level-2.html -> 2)
    const match = window.location.pathname.match(/level-(\d+)/);
    const currentLevel = match ? parseInt(match[1]) : 1;

    if (currentLevel > 1) {
        const isUnlocked = await window.ArithmoProgress.isLevelUnlocked(currentLevel);

        if (!isUnlocked) {
            console.warn(`🔒 Level ${currentLevel} is locked.`);
            alert(`Level ${currentLevel} is locked! Complete the previous levels first.`);
            window.location.href = "../roadmap.html";
        } else {
            console.log(`🔓 Level ${currentLevel} access granted.`);
        }
    }
})();