// final-navbar.js - ONE AND ONLY NAVBAR SCRIPT
(function () {
    console.log('🚀 FINAL NAVBAR: Loading...');

    let isMenuOpen = false;

    // MAIN FUNCTION: Generate navbar ONCE
    function generateNavbar() {
        const navContainer = document.getElementById('nav_container_id');
        if (!navContainer) {
            console.error('❌ No nav container found!');
            return;
        }

        // Get user info
        const userData = localStorage.getItem('arithmo_user');
        const token = localStorage.getItem('arithmo_jwt');
        const isLoggedIn = !!(userData && token);

        let userInitial = 'U';
        let username = 'User';

        if (isLoggedIn && userData) {
            try {
                const user = JSON.parse(userData);
                username = user.username || 'User';
                userInitial = username.charAt(0).toUpperCase();
            } catch (e) {
                console.error('Error parsing user:', e);
            }
        }

        console.log('📊 User logged in:', isLoggedIn, 'Initial:', userInitial);

        // Generate HTML
        navContainer.innerHTML = `
            <!-- Mobile Menu Button -->
            <div class="small-screen-nav-bar-btn" id="mobileMenuBtn">
                <i class="fa-solid fa-bars"></i>
            </div>
            
            <!-- Mobile Menu -->
            <div class="small-screen-nav-bar-links-container" id="mobileMenu">
                <ul>
                    <a href="index.html"><li class="small-screen-nav-links">HOME</li></a>
                    <a href="arithmo-about.html"><li class="small-screen-nav-links">ABOUT</li></a>
                    <a href="arithmo-contact.html"><li class="small-screen-nav-links">CONTACT</li></a>
                    <a href="arithmo-login.html"><li class="small-screen-nav-links" id="mobileLoginLink">${isLoggedIn ? 'YOU' : 'LOGIN'}</li></a>
                </ul>
            </div>

            <!-- Desktop Navbar -->
            <header id="navbar" class="flex w-full items-center justify-between px-4 sm:px-6 lg:px-10 py-4 sm:py-5 transition-all duration-300">
                <!-- Logo -->
                <div class="flex items-center gap-3">
                    <img src="assets/images/arithmo-logo.png" alt="Arithmo Logo" class="h-10 w-auto object-contain" />
                    <h2 class="font-brand text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        arithmo
                    </h2>
                </div>

                <!-- Desktop Links -->
                <nav class="hidden md:flex items-center gap-6 lg:gap-8">
                    <a href="index.html" class="text-sm font-bold uppercase text-zinc-900 dark:text-white hover:text-primary transition-colors duration-200">HOME</a>
                    <a href="arithmo-about.html" class="text-sm font-bold uppercase text-zinc-900 dark:text-white hover:text-primary transition-colors duration-200">ABOUT</a>
                    <a href="arithmo-contact.html" class="text-sm font-bold uppercase text-zinc-900 dark:text-white hover:text-primary transition-colors duration-200">CONTACT</a>
                    
                    <!-- Dynamic User Button -->
                    <div id="desktopUserButton">
                        ${isLoggedIn ? `
                        <button onclick="window.location.href='arithmo-login.html'"
                                class="flex items-center gap-2 rounded-full border border-zinc-300/70 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase text-zinc-800 shadow-sm backdrop-blur-sm hover:bg-white/90 hover:border-zinc-400 transition-all duration-300">
                            <span>You</span>
                            <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#4A90E2] text-[10px] font-bold text-white">
                                ${userInitial}
                            </span>
                        </button>
                        ` : `
                        <button onclick="window.location.href='arithmo-login.html'"
                                class="flex items-center gap-2 rounded-full border border-zinc-300/70 bg-white/70 px-5 py-2.5 text-xs font-semibold uppercase text-zinc-800 shadow-sm backdrop-blur-sm hover:bg-white/90 hover:border-zinc-400 transition-all duration-300">
                            <span>Sign In</span>
                            <span class="text-sm ml-1">→</span>
                        </button>
                        `}
                    </div>
                </nav>
            </header>
        `;

        // Setup mobile menu
        setupMobileMenu();

        // Setup scroll effect
        setupScrollEffect();

        console.log('✅ FINAL NAVBAR: Generated successfully');
    }

    // Setup mobile menu
    function setupMobileMenu() {
        const menuBtn = document.getElementById('mobileMenuBtn');
        const menu = document.getElementById('mobileMenu');

        if (!menuBtn || !menu) {
            console.log('⏳ Waiting for mobile menu elements...');
            setTimeout(setupMobileMenu, 100);
            return;
        }

        // Remove old event listeners
        const newBtn = menuBtn.cloneNode(true);
        menuBtn.parentNode.replaceChild(newBtn, menuBtn);

        // Add click event
        newBtn.addEventListener('click', function (e) {
            e.stopPropagation();

            if (isMenuOpen) {
                menu.style.right = '-210px';
                newBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
                newBtn.style.border = 'none';
                isMenuOpen = false;
            } else {
                menu.style.right = '0px';
                newBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                newBtn.style.border = '1px solid #fff';
                isMenuOpen = true;
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', function (e) {
            if (isMenuOpen && !menu.contains(e.target) && !newBtn.contains(e.target)) {
                menu.style.right = '-210px';
                newBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
                newBtn.style.border = 'none';
                isMenuOpen = false;
            }
        });

        console.log('✅ FINAL NAVBAR: Mobile menu setup');
    }

    // Setup scroll effect for glassmorphism
    function setupScrollEffect() {
        const navbar = document.getElementById("navbar");

        if (!navbar) {
            console.log('⏳ Waiting for navbar for scroll effect...');
            setTimeout(setupScrollEffect, 100);
            return;
        }

        window.addEventListener("scroll", () => {
            if (window.scrollY > 2) {
                navbar.classList.add("nav-scrolled");
            } else {
                navbar.classList.remove("nav-scrolled");
            }
        });

        // Initial check
        if (window.scrollY > 2) {
            navbar.classList.add("nav-scrolled");
        }

        console.log('✅ FINAL NAVBAR: Scroll effect setup');
    }

    // Function to ONLY update user initial (without regenerating navbar)
    function updateUserInitial() {
        const userData = localStorage.getItem('arithmo_user');
        const token = localStorage.getItem('arithmo_jwt');
        const isLoggedIn = !!(userData && token);

        let userInitial = 'U';

        if (isLoggedIn && userData) {
            try {
                const user = JSON.parse(userData);
                userInitial = user.username.charAt(0).toUpperCase();
            } catch (e) { }
        }

        // Update desktop button
        const desktopButton = document.getElementById('desktopUserButton');
        if (desktopButton) {
            if (isLoggedIn) {
                desktopButton.innerHTML = `
                    <button onclick="window.location.href='arithmo-login.html'"
                            class="flex items-center gap-2 rounded-full border border-zinc-300/70 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase text-zinc-800 shadow-sm backdrop-blur-sm hover:bg-white/90 hover:border-zinc-400 transition-all duration-300">
                        <span>You</span>
                        <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#4A90E2] text-[10px] font-bold text-white">
                            ${userInitial}
                        </span>
                    </button>
                `;
            } else {
                desktopButton.innerHTML = `
                    <button onclick="window.location.href='arithmo-login.html'"
                            class="flex items-center gap-2 rounded-full border border-zinc-300/70 bg-white/70 px-5 py-2.5 text-xs font-semibold uppercase text-zinc-800 shadow-sm backdrop-blur-sm hover:bg-white/90 hover:border-zinc-400 transition-all duration-300">
                        <span>Sign In</span>
                        <span class="text-sm ml-1">→</span>
                    </button>
                `;
            }
        }

        // Update mobile link
        const mobileLink = document.getElementById('mobileLoginLink');
        if (mobileLink) {
            mobileLink.textContent = isLoggedIn ? 'YOU' : 'LOGIN';
        }
    }

    // INITIALIZE EVERYTHING
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            generateNavbar();
            setTimeout(updateUserInitial, 300);
        });
    } else {
        generateNavbar();
        setTimeout(updateUserInitial, 300);
    }

    // Update user initial every 2 seconds (only updates if changed)
    setInterval(updateUserInitial, 2000);

    // Update when login status changes
    window.addEventListener('storage', function (e) {
        if (e.key === 'arithmo_user' || e.key === 'arithmo_jwt') {
            updateUserInitial();
        }
    });

    // Make function available globally
    window.updateNavbar = updateUserInitial;

})();