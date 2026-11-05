// Theme toggle (all pages) and the Lorenz animation (research page only).
(function () {
  var root = document.documentElement;

  function effectiveTheme() {
    return root.dataset.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    var label = function () {
      toggle.setAttribute('aria-label', effectiveTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    };
    label();
    toggle.addEventListener('click', function () {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      label();
      document.dispatchEvent(new Event('themechange'));
    });
  }

  // ---- Lorenz trajectories, started 0.001 apart ----
  var canvas = document.getElementById('attractor');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SIGMA = 10, RHO = 28, BETA = 8 / 3, DT = 0.006;
  var TRAIL = 700, STEPS_PER_FRAME = 2, CHUNK = 14;

  function f(x, y, z) {
    return [SIGMA * (y - x), x * (RHO - z) - y, x * y - BETA * z];
  }

  function step(s) {
    var h = DT / 2;
    var k1 = f(s[0], s[1], s[2]);
    var k2 = f(s[0] + h * k1[0], s[1] + h * k1[1], s[2] + h * k1[2]);
    var k3 = f(s[0] + h * k2[0], s[1] + h * k2[1], s[2] + h * k2[2]);
    var k4 = f(s[0] + DT * k3[0], s[1] + DT * k3[1], s[2] + DT * k3[2]);
    s[0] += (DT / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    s[1] += (DT / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    s[2] += (DT / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
  }

  var base = [1, 1, 1];
  for (var i = 0; i < 3000; i++) step(base);
  var offsets = [[0, 0, 0], [0.001, 0, 0], [0, 0.001, 0]];
  var states = offsets.map(function (o) {
    return [base[0] + o[0], base[1] + o[1], base[2] + o[2]];
  });
  var trails = states.map(function () { return []; });

  function advance() {
    for (var j = 0; j < states.length; j++) {
      step(states[j]);
      var t = trails[j];
      t.push([states[j][0], states[j][2]]);
      if (t.length > TRAIL) t.shift();
    }
  }

  function colors() {
    var cs = getComputedStyle(root);
    return [
      cs.getPropertyValue('--accent').trim(),
      cs.getPropertyValue('--warm').trim(),
      cs.getPropertyValue('--teal').trim()
    ];
  }
  var palette = colors();

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var w = Math.round(canvas.clientWidth * dpr);
    var h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
    }
    return dpr;
  }

  function draw() {
    var dpr = resize();
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    var s = Math.min(w / 46, h / 54);
    var offY = (h - 50 * s) / 2;
    ctx.lineWidth = 1.6 * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (var j = trails.length - 1; j >= 0; j--) {
      var t = trails[j], n = t.length;
      if (n < 2) continue;
      ctx.strokeStyle = palette[j];
      for (var k = 1; k < n; k += CHUNK) {
        ctx.globalAlpha = Math.pow(k / n, 1.6) * 0.95;
        ctx.beginPath();
        var p = t[k - 1];
        ctx.moveTo(w / 2 + p[0] * s, h - offY - p[1] * s);
        var end = Math.min(k + CHUNK, n);
        for (var m = k; m < end; m++) {
          p = t[m];
          ctx.lineTo(w / 2 + p[0] * s, h - offY - p[1] * s);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  var running = false;
  function frame() {
    if (!running) return;
    for (var i = 0; i < STEPS_PER_FRAME; i++) advance();
    draw();
    requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  if (reduce) {
    for (var i2 = 0; i2 < 4200; i2++) advance();
    draw();
  } else if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start();
      else running = false;
    }).observe(canvas);
  } else {
    start();
  }
  window.addEventListener('resize', draw);

  var repaint = function () { palette = colors(); draw(); };
  document.addEventListener('themechange', repaint);
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', repaint);
})();
