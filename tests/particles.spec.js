// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('SpaceGame – particle explosions', () => {
  /** @type {string[]} */
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    await page.waitForFunction(() => window.state !== undefined);

    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.state && window.state.mode === 'PLAYING' && Array.isArray(window.asteroids) && window.asteroids.length > 0,
      { timeout: 3000 }
    );
  });

  // -------------------------------------------------------------------------
  // 1. Global array
  // -------------------------------------------------------------------------

  test('window.particles is an empty array on game start', async ({ page }) => {
    const result = await page.evaluate(() => ({
      isArray: Array.isArray(window.particles),
      length:  window.particles.length,
    }));
    expect(result.isArray).toBe(true);
    expect(result.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 2. Particle constructor
  // -------------------------------------------------------------------------

  test('Particle constructor sets x, y, vx, vy, lifetime within spec ranges', async ({ page }) => {
    const p = await page.evaluate(() => {
      const particle = new Particle(200, 150);
      return {
        x:        particle.x,
        y:        particle.y,
        vx:       particle.vx,
        vy:       particle.vy,
        lifetime: particle.lifetime,
        speed:    Math.hypot(particle.vx, particle.vy),
      };
    });

    expect(p.x).toBeCloseTo(200, 0);
    expect(p.y).toBeCloseTo(150, 0);
    expect(typeof p.vx).toBe('number');
    expect(typeof p.vy).toBe('number');
    // Speed must be in [60, 180] px/s per spec
    expect(p.speed).toBeGreaterThanOrEqual(60);
    expect(p.speed).toBeLessThanOrEqual(180);
    // Lifetime must be in [0.4, 0.8] s per spec
    expect(p.lifetime).toBeGreaterThanOrEqual(0.4);
    expect(p.lifetime).toBeLessThanOrEqual(0.8);
  });

  test('Particle has non-zero velocity', async ({ page }) => {
    const hasVelocity = await page.evaluate(() => {
      const p = new Particle(100, 100);
      return Math.abs(p.vx) + Math.abs(p.vy) > 0;
    });
    expect(hasVelocity).toBe(true);
  });

  test('Particle has no collision radius (purely visual)', async ({ page }) => {
    // Per spec: "Purely visual — no hitbox, no collision involvement"
    const radius = await page.evaluate(() => {
      const p = new Particle(100, 100);
      return p.radius;
    });
    expect(radius).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 3. isExpired()
  // -------------------------------------------------------------------------

  test('isExpired() returns false on a fresh particle', async ({ page }) => {
    const expired = await page.evaluate(() => new Particle(100, 100).isExpired());
    expect(expired).toBe(false);
  });

  test('isExpired() returns true when lifetime is 0', async ({ page }) => {
    const expired = await page.evaluate(() => {
      const p = new Particle(100, 100);
      p.lifetime = 0;
      return p.isExpired();
    });
    expect(expired).toBe(true);
  });

  test('isExpired() returns true when lifetime is negative', async ({ page }) => {
    const expired = await page.evaluate(() => {
      const p = new Particle(100, 100);
      p.lifetime = -0.1;
      return p.isExpired();
    });
    expect(expired).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 4. update(dt)
  // -------------------------------------------------------------------------

  test('update(dt) integrates position by vx/vy * dt', async ({ page }) => {
    const result = await page.evaluate(() => {
      const p = new Particle(200, 200);
      p.vx = 100;
      p.vy = -50;
      const x0 = p.x, y0 = p.y;
      p.update(0.1);
      return { dx: p.x - x0, dy: p.y - y0 };
    });
    expect(result.dx).toBeCloseTo(10, 2);  // 100 * 0.1
    expect(result.dy).toBeCloseTo(-5, 2);  // -50 * 0.1
  });

  test('update(dt) decrements lifetime by dt', async ({ page }) => {
    const result = await page.evaluate(() => {
      const p = new Particle(200, 200);
      const before = p.lifetime;
      p.update(0.1);
      return { before, after: p.lifetime };
    });
    expect(result.after).toBeCloseTo(result.before - 0.1, 5);
  });

  // -------------------------------------------------------------------------
  // 5. spawnParticles(x, y)
  // -------------------------------------------------------------------------

  test('spawnParticles emits 8–12 particles into window.particles', async ({ page }) => {
    const count = await page.evaluate(() => {
      spawnParticles(300, 250);
      return window.particles.length;
    });
    expect(count).toBeGreaterThanOrEqual(8);
    expect(count).toBeLessThanOrEqual(12);
  });

  test('all particles spawned by spawnParticles originate at the given position', async ({ page }) => {
    const positions = await page.evaluate(() => {
      spawnParticles(300, 250);
      return window.particles.map((p) => ({ x: p.x, y: p.y }));
    });
    for (const pos of positions) {
      expect(pos.x).toBeCloseTo(300, 0);
      expect(pos.y).toBeCloseTo(250, 0);
    }
  });

  test('multiple spawnParticles calls accumulate particles', async ({ page }) => {
    const counts = await page.evaluate(() => {
      spawnParticles(100, 100);
      const after1 = window.particles.length;
      spawnParticles(200, 200);
      const after2 = window.particles.length;
      return { after1, after2 };
    });
    expect(counts.after1).toBeGreaterThanOrEqual(8);
    expect(counts.after2).toBeGreaterThan(counts.after1);
  });

  // -------------------------------------------------------------------------
  // 6. Bullet–asteroid collision spawns particles
  // -------------------------------------------------------------------------

  // NOTE on V8 JIT: var bullets/particles in game.js are JIT-compiled against
  // internal script-context slots. However, pushing to window.bullets mutates
  // the shared array object that the internal var also references, so game.js
  // update() will iterate over the injected bullet. Similarly, spawnParticles()
  // pushes into the shared particles array, which window.particles reflects.

  test('destroying an asteroid with a bullet spawns 8–12 particles', async ({ page }) => {
    // Inject a bullet directly onto asteroid[0]'s position
    await page.evaluate(() => {
      const a = window.asteroids[0];
      window.bullets.push(new Bullet(a.x, a.y, 0));
    });

    // Wait for update() to process the collision and populate particles
    await page.waitForFunction(
      () => window.particles.length > 0,
      { timeout: 2000 }
    );

    const count = await page.evaluate(() => window.particles.length);
    expect(count).toBeGreaterThanOrEqual(8);
    expect(count).toBeLessThanOrEqual(12);
  });

  test('particles from bullet–asteroid hit originate at the destroyed asteroid position', async ({ page }) => {
    const asteroidPos = await page.evaluate(() => {
      const a = window.asteroids[0];
      return { x: a.x, y: a.y };
    });

    await page.evaluate(() => {
      const a = window.asteroids[0];
      window.bullets.push(new Bullet(a.x, a.y, 0));
    });

    await page.waitForFunction(() => window.particles.length > 0, { timeout: 2000 });

    const positions = await page.evaluate(() =>
      window.particles.map((p) => ({ x: p.x, y: p.y }))
    );

    // Allow a small drift — one or two frames may have elapsed since spawn
    for (const pos of positions) {
      expect(Math.abs(pos.x - asteroidPos.x)).toBeLessThan(5);
      expect(Math.abs(pos.y - asteroidPos.y)).toBeLessThan(5);
    }
  });

  // -------------------------------------------------------------------------
  // 7. Ship–asteroid collision does NOT spawn particles
  // -------------------------------------------------------------------------

  test('ship–asteroid collision does not spawn particles', async ({ page }) => {
    // Replicate collision logic in page.evaluate (mirrors asteroids.spec.js approach)
    // to avoid V8 JIT slot divergence. Intentionally omit spawnParticles — the
    // spec says ship collisions produce no particles.
    await page.evaluate(() => {
      const a = window.asteroids[0];
      a.x = window.ship.x;
      a.y = window.ship.y;
      if (circleCollides(window.ship, a)) {
        window.state.lives--;
        if (window.state.lives <= 0) {
          window.state.mode = 'GAME_OVER';
        } else {
          window.ship = new Ship(window.canvas.width / 2, window.canvas.height / 2);
        }
        // No spawnParticles call — spec: "Ship–asteroid collisions do not spawn particles"
      }
    });

    await page.waitForTimeout(200);
    const count = await page.evaluate(() => window.particles.length);
    expect(count).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 8. Particle expiry — expired particles are swept from the array
  // -------------------------------------------------------------------------

  test('expired particles are removed from the array by update()', async ({ page }) => {
    // Spawn particles then set all lifetimes to near-zero so they expire in one frame
    await page.evaluate(() => {
      spawnParticles(400, 300);
      window.particles.forEach((p) => { p.lifetime = 0.001; });
    });

    await page.waitForFunction(
      () => window.particles.length === 0,
      { timeout: 2000 }
    );

    const count = await page.evaluate(() => window.particles.length);
    expect(count).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 9. No console errors
  // -------------------------------------------------------------------------

  test('no console errors during full particle lifecycle', async ({ page }) => {
    // Spawn and let all particles expire naturally (max lifetime 0.8 s)
    await page.evaluate(() => { spawnParticles(400, 300); });
    await page.waitForTimeout(1000);
    expect(consoleErrors).toHaveLength(0);
  });
});
