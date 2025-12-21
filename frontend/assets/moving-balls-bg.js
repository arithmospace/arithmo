(function () {
  function initMovingBallsBackground() {
    const body = document.body;
    if (!body.classList.contains("moving-balls-bg")) return;

    const canvas = document.createElement("canvas");
    canvas.className = "mbb-canvas";

    const haze = document.createElement("div");
    haze.className = "mbb-haze";

    body.appendChild(canvas);
    body.appendChild(haze);

    const ctx = canvas.getContext("2d", { alpha: true });

    let width, height;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5); // 🔥 clamp DPR

    const colors = [
      "#4da3ff", "#4da3ff",
      "#ff9800", "#ff9800",
      "#ff5252", "#ff5252",
      "#9e9e9e", "#9e9e9e"
    ];

    const BALL_RADIUS = 22;
    const BALL_COUNT = colors.length;
    const balls = [];

    let scrollOffsetY = 0;
    let running = true;

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    function random(min, max) {
      return Math.random() * (max - min) + min;
    }

    function createBalls() {
      balls.length = 0;
      const minSpacing = BALL_RADIUS * 4.5;

      for (let i = 0; i < BALL_COUNT; i++) {
        let x, y, tries = 0, good;

        do {
          x = random(BALL_RADIUS, width - BALL_RADIUS);
          y = random(BALL_RADIUS, height - BALL_RADIUS);
          good = true;

          for (let j = 0; j < balls.length; j++) {
            const dx = x - balls[j].x;
            const dy = y - balls[j].y;
            if (Math.sqrt(dx * dx + dy * dy) < minSpacing) {
              good = false;
              break;
            }
          }
          tries++;
          if (tries > 40) good = true;
        } while (!good);

        let vx = random(-0.035, 0.035);
        let vy = random(-0.035, 0.035);
        if (Math.abs(vx) < 0.012) vx = vx < 0 ? -0.012 : 0.012;
        if (Math.abs(vy) < 0.012) vy = vy < 0 ? -0.012 : 0.012;

        balls.push({
          x,
          y,
          r: BALL_RADIUS,
          vx,
          vy,
          color: colors[i]
        });
      }
    }

    createBalls();

    function update(dt) {
      for (const b of balls) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.x - b.r < 0 || b.x + b.r > width) b.vx *= -1;
        if (b.y - b.r < 0 || b.y + b.r > height) b.vy *= -1;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      for (const b of balls) {
        const yWithScroll = b.y + scrollOffsetY * 0.15;

        const outerR = b.r * 3.2;
        const gradient = ctx.createRadialGradient(
          b.x, yWithScroll, b.r * 0.2,
          b.x, yWithScroll, outerR
        );
        gradient.addColorStop(0, b.color + "aa");
        gradient.addColorStop(1, "rgba(0,0,0,0)");

        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.beginPath();
        ctx.arc(b.x, yWithScroll, outerR, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(b.x, yWithScroll, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
      }
    }

    let lastTime = performance.now();
    const TARGET_FPS = 30;
    const FRAME_TIME = 1000 / TARGET_FPS;

    function loop(now) {
      if (!running) return;

      const delta = now - lastTime;
      if (delta < FRAME_TIME) {
        requestAnimationFrame(loop);
        return;
      }

      lastTime = now;
      update(delta);
      draw();
      requestAnimationFrame(loop);
    }

    // ✅ Pause when tab inactive
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) {
        lastTime = performance.now();
        requestAnimationFrame(loop);
      }
    });

    // // ✅ Scroll-linked movement (cheap)
    // window.addEventListener(
    //   "scroll",
    //   () => {
    //     scrollOffsetY = window.scrollY;
    //   },
    //   { passive: true }
    // );

    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMovingBallsBackground);
  } else {
    initMovingBallsBackground();
  }
})();
