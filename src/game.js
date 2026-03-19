// --- Bootstrap: load all modules via script tags injected before game.js ---
(function loadScripts() {
  var base = document.currentScript
    ? document.currentScript.src.replace(/game\.js$/, '')
    : 'src/';
  var modules = ['utils.js', 'input.js', 'collision.js', 'bullet.js', 'asteroid.js', 'ship.js', 'particle.js', 'renderer.js'];
  modules.forEach(function(m) {
    var s = document.createElement('script');
    s.src = base + m;
    document.head.appendChild(s);
  });
  // Wait for all scripts, then init
  window.addEventListener('load', init);
})();

// --- State ---
var canvas, ctx, input;
var state = {
  mode: 'MENU',   // MENU | PLAYING | WAVE_CLEAR | GAME_OVER
  score: 0,
  lives: 3,
  wave: 0,
  wavePause: 0,
};
var ship, asteroids, bullets, particles;
var lastTime = 0;

// --- Init ---
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  input = new Input();

  window.addEventListener('keydown', function(e) {
    if (e.code === 'Enter') {
      if (state.mode === 'MENU' || state.mode === 'GAME_OVER') resetGame();
    }
  });

  requestAnimationFrame(gameLoop);
}

// --- Main loop ---
function gameLoop(timestamp) {
  var dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// --- Update ---
function update(dt) {
  if (state.mode !== 'PLAYING' && state.mode !== 'WAVE_CLEAR') return;

  if (state.mode === 'WAVE_CLEAR') {
    state.wavePause -= dt;
    if (state.wavePause <= 0) {
      state.wave++;
      spawnWave(3 + state.wave);
      state.mode = 'PLAYING';
    }
    return;
  }

  // Update ship
  ship.update(dt, input, canvas.width, canvas.height);

  // Shoot (Space held down — rate-limited by ship.fireCooldown)
  if (input.isDown('Space')) {
    var b = ship.fire();
    if (b) bullets.push(b);
  }

  // Update bullets
  for (var i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update(dt);
    if (bullets[i].isExpired()) bullets.splice(i, 1);
  }

  // Update asteroids
  for (var j = 0; j < asteroids.length; j++) {
    asteroids[j].update(dt, canvas.width, canvas.height);
  }

  // Update particles
  for (var pi = particles.length - 1; pi >= 0; pi--) {
    particles[pi].update(dt, canvas.width, canvas.height);
    if (particles[pi].isExpired()) particles.splice(pi, 1);
  }

  // Bullet vs asteroid
  for (var bi = bullets.length - 1; bi >= 0; bi--) {
    for (var ai = asteroids.length - 1; ai >= 0; ai--) {
      if (circleCollides(bullets[bi], asteroids[ai])) {
        state.score += asteroids[ai].score;
        spawnParticles(asteroids[ai].x, asteroids[ai].y);
        var fragments = asteroids[ai].split();
        asteroids.splice(ai, 1);
        bullets.splice(bi, 1);
        asteroids = asteroids.concat(fragments);
        break;
      }
    }
  }

  // Ship vs asteroid
  for (var k = 0; k < asteroids.length; k++) {
    if (circleCollides(ship, asteroids[k])) {
      state.lives--;
      if (state.lives <= 0) {
        state.mode = 'GAME_OVER';
        return;
      }
      ship = new Ship(canvas.width / 2, canvas.height / 2);
      break;
    }
  }

  // Wave clear
  if (asteroids.length === 0) {
    state.mode = 'WAVE_CLEAR';
    state.wavePause = 2;
  }
}

// --- Render ---
function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.mode === 'MENU') {
    drawScreen(ctx, canvas.width, canvas.height, 'SPACEGAME', 'Press ENTER to start');
    return;
  }

  if (state.mode === 'GAME_OVER') {
    drawScreen(ctx, canvas.width, canvas.height, 'GAME OVER', 'Score: ' + state.score + '  —  Press ENTER');
    return;
  }

  asteroids.forEach(function(a) { drawAsteroid(ctx, a); });
  bullets.forEach(function(b)   { drawBullet(ctx, b); });
  drawParticles(ctx, particles);
  drawShip(ctx, ship);
  drawHUD(ctx, state);

  if (state.mode === 'WAVE_CLEAR') {
    drawScreen(ctx, canvas.width, canvas.height, 'WAVE ' + (state.wave + 1), 'Get ready...');
  }
}

// --- Helpers ---
function spawnWave(count) {
  asteroids = [];
  bullets = [];
  for (var i = 0; i < count; i++) {
    var x, y;
    // Keep asteroids away from the ship center
    do {
      x = randomRange(0, canvas.width);
      y = randomRange(0, canvas.height);
    } while (Math.hypot(x - canvas.width / 2, y - canvas.height / 2) < 120);
    asteroids.push(new Asteroid(x, y, 'large'));
  }
}

function spawnParticles(x, y) {
  var count = Math.floor(randomRange(8, 13));
  for (var i = 0; i < count; i++) {
    particles.push(new Particle(x, y));
  }
}

function resetGame() {
  state.score = 0;
  state.lives = 3;
  state.wave = 0;
  state.mode = 'PLAYING';
  particles = [];
  ship = new Ship(canvas.width / 2, canvas.height / 2);
  spawnWave(4);
}
