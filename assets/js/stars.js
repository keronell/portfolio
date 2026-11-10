/* Slow drifting starfield.

   Square pixels in white and gold on a fixed canvas behind the page content.
   Three depth layers give a little parallax: far stars are small, dim and slow,
   near stars are brighter and drift faster. Runs at ~30fps (the motion is far
   too slow to need more), pauses while the tab is hidden, and draws a single
   static frame for visitors who prefer reduced motion. */

(function () {
  "use strict";

  var canvas = document.createElement("canvas");
  canvas.className = "starfield";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var WHITE = "241, 243, 245";
  var GOLD = "201, 162, 39";

  // size in CSS px, drift in px per second, alpha range, share of the field
  var LAYERS = [
    { size: 1, speed: 0.95, min: 0.22, max: 0.46, share: 0.64 },
    { size: 2, speed: 1.95, min: 0.38, max: 0.68, share: 0.28 },
    { size: 3, speed: 3.50, min: 0.58, max: 0.88, share: 0.08 }
  ];

  // Drift direction: slightly right of straight up.
  var DRIFT_X = 0.28;
  var DRIFT_Y = -1;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var width = 0, height = 0, stars = [], frame = null, last = 0, elapsed = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function pickLayer() {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < LAYERS.length; i++) {
      acc += LAYERS[i].share;
      if (r < acc) return LAYERS[i];
    }
    return LAYERS[0];
  }

  function build() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    var count = Math.max(55, Math.min(260, Math.round((width * height) / 9000)));
    stars = [];

    for (var i = 0; i < count; i++) {
      var layer = pickLayer();
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: layer.size,
        vx: DRIFT_X * layer.speed * rand(0.7, 1.3),
        vy: DRIFT_Y * layer.speed * rand(0.7, 1.3),
        alpha: rand(layer.min, layer.max),
        // A minority of stars are gold, and they skew towards the brighter layers.
        colour: Math.random() < (layer.size === 1 ? 0.34 : 0.50) ? GOLD : WHITE,
        // The nearest stars get a dim square halo so they read as genuinely bright.
        halo: layer.size === 3,
        // Twinkle is deliberately shallow and slow - texture, not strobing.
        phase: Math.random() * Math.PI * 2,
        rate: rand(0.18, 0.55)
      });
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var alpha = s.alpha * (0.78 + 0.22 * Math.sin(time * s.rate + s.phase));
      // Rounding keeps every star an exact, crisp square.
      var x = Math.round(s.x), y = Math.round(s.y);

      if (s.halo) {
        ctx.fillStyle = "rgba(" + s.colour + ", " + (alpha * 0.16).toFixed(3) + ")";
        ctx.fillRect(x - 2, y - 2, s.size + 4, s.size + 4);
      }

      ctx.fillStyle = "rgba(" + s.colour + ", " + alpha.toFixed(3) + ")";
      ctx.fillRect(x, y, s.size, s.size);
    }
  }

  function step(now) {
    frame = window.requestAnimationFrame(step);

    var delta = (now - last) / 1000;
    if (delta < 0.032) return;           // cap at roughly 30fps
    if (delta > 0.5) delta = 0.5;        // a backgrounded tab must not teleport the field
    last = now;
    elapsed += delta;

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.x += s.vx * delta;
      s.y += s.vy * delta;

      // Wrap around the edges, with a margin so nothing pops in mid-view.
      if (s.y < -4) { s.y = height + 4; s.x = Math.random() * width; }
      else if (s.y > height + 4) { s.y = -4; s.x = Math.random() * width; }
      if (s.x < -4) s.x = width + 4;
      else if (s.x > width + 4) s.x = -4;
    }

    draw(elapsed);
  }

  function stop() {
    if (frame !== null) {
      window.cancelAnimationFrame(frame);
      frame = null;
    }
  }

  function start() {
    stop();
    if (reduceMotion.matches) {
      draw(0);
      return;
    }
    last = window.performance.now();
    frame = window.requestAnimationFrame(step);
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      build();
      if (reduceMotion.matches) draw(elapsed);
    }, 180);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (!reduceMotion.matches) start();
  });

  // matchMedia change listener, with a fallback for older Safari.
  var onPreferenceChange = function () { build(); start(); };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", onPreferenceChange);
  else if (reduceMotion.addListener) reduceMotion.addListener(onPreferenceChange);

  build();
  start();
})();
