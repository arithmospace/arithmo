let nav_container = document.getElementById('nav_container_id');

nav_container.innerHTML = `

            <!-- Nav Bar for smaller screen -->
            
                <div class="small-screen-nav-bar-btn">
                  <i class="fa-solid fa-bars"></i>
                </div>
            
                <div class="small-screen-nav-bar-links-container">
                  <ul>
                    <a href="index.html">
                      <li class="small-screen-nav-links">HOME</li>
                    </a>
                    <a href="arithmo-about.html">
                      <li class="small-screen-nav-links">ABOUT</li>
                    </a>
                    <a href="arithmo-contact.html">
                      <li class="small-screen-nav-links">CONTACT</li>
                    </a>
                    <a href="arithmo-login.html">
                      <li class="small-screen-nav-links">LOGIN</li>
                    </a>
                  </ul>
                </div>


            <header id="navbar" class="flex w-full items-center justify-between px-10 py-5 transition-all duration-300">

                <!-- LEFT: LOGO + BRAND NAME -->
                <div class="flex items-center gap-3">
                    <img src="assets/images/arithmo-logo.png" alt="Arithmo Logo" class="h-10 w-auto object-contain" />
                    <h2 class="font-brand text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        arithmo
                    </h2>
                </div>

                <!-- RIGHT: NAV LINKS + YOU BUTTON -->
                <nav class="hidden md:flex items-center gap-8">
                    <a href="index.html" class="text-sm font-bold uppercase text-zinc-900 dark:text-white">HOME</a>
                    <a href="arithmo-about.html"
                        class="text-sm font-bold uppercase text-zinc-900 dark:text-white">ABOUT</a>
                    <a href="arithmo-contact.html" class="text-sm font-bold uppercase text-zinc-900 dark:text-white">CONTACT</a>

                    <!-- YOU BUTTON -->
                    <a href="arithmo-login.html">
                        <button
                            class="flex items-center gap-2 rounded-full border border-zinc-300/70 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase text-zinc-800 shadow-sm backdrop-blur-sm hover:bg-white/90 hover:border-zinc-400 transition">
                            <span>You</span>
                            <span
                                class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#4A90E2] text-[10px] font-bold text-white">
                                U
                            </span>
                        </button>
                    </a>
                </nav>
            </header>

`

let small_screen_nav_bar_btn = document.querySelector('.small-screen-nav-bar-btn');
let small_screen_nav_bar_links_container = document.querySelector('.small-screen-nav-bar-links-container');
let footer_grid = document.querySelector('.footer-grid');

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

// ========== PROGRESS HELPER FUNCTIONS ==========
window.saveActivityProgress = async function (level, activity, rewards = {}, isCompleted = false) {
  if (window.ArithmoProgress) {
    return await window.ArithmoProgress.saveActivityProgress(level, activity, rewards, isCompleted);
  }
  console.error('Progress Manager not loaded');
  return null;
};

window.getUserProgress = async function () {
  if (window.ArithmoProgress) {
    return await window.ArithmoProgress.getProgress();
  }
  return null;
};

window.isUserLoggedIn = function () {
  const token = localStorage.getItem('arithmo_jwt');
  const user = localStorage.getItem('arithmo_user');
  return !!(token && user);
};

// Auto-load progress manager on all pages
if (!window.ArithmoProgress && typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'assets/progress-manager.js';
  script.async = true;
  document.head.appendChild(script);
}