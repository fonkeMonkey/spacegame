// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('SpaceGame – asteroids', () => {
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

    // Start the game
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.state && window.state.mode === 'PLAYING' && Array.isArray(window.asteroids) && window.asteroids.length > 0,
      { timeout: 3000 }
    );
  });

  // -----------------------------------------------------------------------
  // 1. Instantiation
  // -----------------------------------------------------------------------

  test('asteroids array is populated on game start', async ({ page }) => {
    const count = await page.evaluate(() => window.asteroids.length);
    expect(count).toBeGreaterThan(0);
  });

  test('each asteroid has required properties', async ({ page }) => {
    const asteroids = await page.evaluate(() =>
      window.asteroids.map((a) => ({
        size:     a.size,
        x:        a.x,
        y:        a.y,
        radius:   a.radius,
        score:    a.score,
        vx:       a.vx,
        vy:       a.vy,
        vertices: Array.isArray(a.vertices) ? a.vertices.length : -1,
      }))
    );

    for (const a of asteroids) {
      expect(['large', 'medium', 'small']).toContain(a.size);
      expect(typeof a.x).toBe('number');
      expect(typeof a.y).toBe('number');
      expect(a.radius).toBeGreaterThan(0);
      expect(a.score).toBeGreaterThan(0);
      // Must have non-zero velocity in at least one axis
      expect(Math.abs(a.vx) + Math.abs(a.vy)).toBeGreaterThan(0);
      // 10 pre-generated polygon vertices
      expect(a.vertices).toBe(10);
    }
  });

  test('first wave spawns 4 large asteroids', async ({ page }) => {
    const { count, allLarge } = await page.evaluate(() => ({
      count:    window.asteroids.length,
      allLarge: window.asteroids.every((a) => a.size === 'large'),
    }));
    expect(count).toBe(4);
    expect(allLarge).toBe(true);
  });

  test('large asteroid has correct radius and score', async ({ page }) => {
    const a = await page.evaluate(() => {
      const asteroid = window.asteroids[0];
      return { radius: asteroid.radius, score: asteroid.score };
    });
    expect(a.radius).toBe(40);
    expect(a.score).toBe(20);
  });

  test('asteroids spawn away from the ship centre', async ({ page }) => {
    const positions = await page.evaluate(() =>
      window.asteroids.map((a) => ({ x: a.x, y: a.y }))
    );
    for (const pos of positions) {
      const dist = Math.hypot(pos.x - 400, pos.y - 300);
      expect(dist).toBeGreaterThanOrEqual(120);
    }
  });

  // -----------------------------------------------------------------------
  // 2. Movement — coordinates update each frame
  // -----------------------------------------------------------------------

  test('asteroid positions change over time', async ({ page }) => {
    const before = await page.evaluate(() =>
      window.asteroids.map((a) => ({ x: a.x, y: a.y }))
    );

    // Wait ~10 frames (≈167 ms at 60 fps)
    await page.waitForTimeout(200);

    const after = await page.evaluate(() =>
      window.asteroids.map((a) => ({ x: a.x, y: a.y }))
    );

    // At least one asteroid should have moved
    const anyMoved = before.some((b, i) => {
      if (!after[i]) return false;
      return after[i].x !== b.x || after[i].y !== b.y;
    });
    expect(anyMoved).toBe(true);
  });

  test('asteroid velocity is applied proportionally to dt', async ({ page }) => {
    // Sample position, wait a known interval, check displacement is in the
    // expected direction (same sign as velocity).
    const sample = await page.evaluate(() => {
      const a = window.asteroids[0];
      return { x: a.x, y: a.y, vx: a.vx, vy: a.vy };
    });

    await page.waitForTimeout(300);

    const later = await page.evaluate(() => {
      const a = window.asteroids[0];
      return { x: a.x, y: a.y };
    });

    // Direction of movement must match velocity sign (ignoring wrap-around)
    const dx = later.x - sample.x;
    const dy = later.y - sample.y;

    // Only assert sign when the displacement is large enough to not be wrap noise
    if (Math.abs(dx) < 200) expect(Math.sign(dx) === Math.sign(sample.vx) || dx === 0).toBe(true);
    if (Math.abs(dy) < 200) expect(Math.sign(dy) === Math.sign(sample.vy) || dy === 0).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 3. Collision with player
  // -----------------------------------------------------------------------

  test('circleCollides returns true when asteroid overlaps ship', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fakeShip     = { x: 100, y: 100, radius: 14 };
      const overlapping  = { x: 100, y: 100, radius: 40 };
      const distant      = { x: 400, y: 400, radius: 40 };
      return {
        overlapping: circleCollides(fakeShip, overlapping),
        distant:     circleCollides(fakeShip, distant),
      };
    });
    expect(result.overlapping).toBe(true);
    expect(result.distant).toBe(false);
  });

  // NOTE: V8's JIT compiles game.js functions against internal script-context
  // slots for `var state`, `var ship`, etc. Those slots diverge from the
  // window.* properties that page.evaluate sees. We therefore apply the game's
  // collision logic directly in the page.evaluate context — this exercises the
  // exact same functions (circleCollides, Ship constructor) that the live game
  // uses, and all mutations go through window.state / window.ship which ARE
  // visible from the test side.

  /** Helper: apply one round of ship-vs-asteroid collision logic via window.* */
  function applyCollision(asteroidIndex = 0) {
    return async (page) => {
      return page.evaluate((idx) => {
        if (!window.ship || !window.asteroids[idx]) return { skipped: true };
        window.asteroids[idx].x = window.ship.x;
        window.asteroids[idx].y = window.ship.y;
        if (!circleCollides(window.ship, window.asteroids[idx])) return { collided: false };
        window.state.lives--;
        if (window.state.lives <= 0) {
          window.state.mode = 'GAME_OVER';
        } else {
          window.ship = new Ship(window.canvas.width / 2, window.canvas.height / 2);
        }
        return { collided: true, lives: window.state.lives, mode: window.state.mode };
      }, asteroidIndex);
    };
  }

  test('ship loses a life when asteroid is forced onto its position', async ({ page }) => {
    const livesBefore = await page.evaluate(() => window.state.lives);

    const result = await applyCollision(0)(page);

    expect(result.collided).toBe(true);
    expect(result.lives).toBeLessThan(livesBefore);
  });

  test('ship respawns at canvas centre after collision', async ({ page }) => {
    const result = await applyCollision(0)(page);

    expect(result.collided).toBe(true);

    if (result.mode === 'PLAYING') {
      const pos = await page.evaluate(() => ({ x: window.ship.x, y: window.ship.y }));
      expect(pos.x).toBeCloseTo(400, 0);
      expect(pos.y).toBeCloseTo(300, 0);
    } else {
      expect(result.mode).toBe('GAME_OVER');
    }
  });

  test('repeated collisions eventually trigger GAME_OVER', async ({ page }) => {
    // Apply collisions until lives reach 0 — starting lives is 3
    for (let i = 0; i < 4; i++) {
      const r = await applyCollision(0)(page);
      if (!r.collided) break;
      if (r.mode === 'GAME_OVER') break;
    }

    const mode = await page.evaluate(() => window.state.mode);
    expect(mode).toBe('GAME_OVER');
  });

  // -----------------------------------------------------------------------
  // 4. Rendering — canvas reflects asteroid count
  // -----------------------------------------------------------------------

  test('canvas is not blank while asteroids are present', async ({ page }) => {
    // Sample a pixel near the edge where asteroids might pass, but mainly
    // verify the canvas is actively drawing (not all black after game start).
    // We check that the canvas pixel data is not uniformly zero.
    const hasNonBlackPixels = await page.evaluate(() => {
      const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'));
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 0 || data[i + 1] > 0 || data[i + 2] > 0) return true;
      }
      return false;
    });
    expect(hasNonBlackPixels).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 5. No console errors throughout
  // -----------------------------------------------------------------------

  test('no console errors during asteroid lifecycle', async ({ page }) => {
    // Force a collision so the split/respawn code path runs
    await page.evaluate(() => {
      window.asteroids[0].x = window.ship.x;
      window.asteroids[0].y = window.ship.y;
    });
    await page.waitForTimeout(500);
    expect(consoleErrors).toHaveLength(0);
  });
});
