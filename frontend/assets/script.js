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