// @ts-check
const { test, expect } = require('@playwright/test');

// NOTE on spy technique: playShoot, playExplosion, startThrust, stopThrust are
// declared in audio.js and called from game.js. Because they come from a
// different script file, game.js resolves them through the global scope at each
// call site — NOT through a JIT-compiled local slot. Replacing window.playShoot
// (etc.) with a counter function in page.evaluate is therefore reliable.

test.describe('SpaceGame — sound effects', () => {
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
  });

  // -------------------------------------------------------------------------
  // 1. audioEnabled flag
  // -------------------------------------------------------------------------

  test('window.audioEnabled is true after init()', async ({ page }) => {
    const enabled = await page.evaluate(() => window.audioEnabled);
    expect(enabled).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. Audio functions are callable globals
  // -------------------------------------------------------------------------

  test('ensureAudio, startThrust, stopThrust, playShoot, playExplosion are callable globals', async ({ page }) => {
    const types = await page.evaluate(() => ({
      ensureAudio:   typeof ensureAudio,
      startThrust:   typeof startThrust,
      stopThrust:    typeof stopThrust,
      playShoot:     typeof playShoot,
      playExplosion: typeof playExplosion,
    }));
    expect(types.ensureAudio).toBe('function');
    expect(types.startThrust).toBe('function');
    expect(types.stopThrust).toBe('function');
    expect(types.playShoot).toBe('function');
    expect(types.playExplosion).toBe('function');
  });

  // -------------------------------------------------------------------------
  // 3. ensureAudio() behaviour
  // -------------------------------------------------------------------------

  test('ensureAudio() returns null when audioEnabled is false', async ({ page }) => {
    const result = await page.evaluate(() => {
      window.audioEnabled = false;
      return ensureAudio();
    });
    expect(result).toBeNull();
  });

  test('ensureAudio() returns the same AudioContext object on repeated calls', async ({ page }) => {
    // A keyboard interaction unlocks the AudioContext in Chromium
    await page.keyboard.press('Tab');
    const same = await page.evaluate(() => {
      window.audioEnabled = true;
      const ctx1 = ensureAudio();
      const ctx2 = ensureAudio();
      return ctx1 !== null && ctx1 === ctx2;
    });
    expect(same).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 4. Sound functions are safe when audioEnabled=false (no throws, no errors)
  // -------------------------------------------------------------------------

  test('startThrust() does not throw when audioEnabled is false', async ({ page }) => {
    await expect(page.evaluate(() => {
      window.audioEnabled = false;
      startThrust();
    })).resolves.not.toThrow();
    expect(consoleErrors).toHaveLength(0);
  });

  test('stopThrust() does not throw when audioEnabled is false', async ({ page }) => {
    await expect(page.evaluate(() => {
      window.audioEnabled = false;
      stopThrust();
    })).resolves.not.toThrow();
    expect(consoleErrors).toHaveLength(0);
  });

  test('playShoot() does not throw when audioEnabled is false', async ({ page }) => {
    await expect(page.evaluate(() => {
      window.audioEnabled = false;
      playShoot();
    })).resolves.not.toThrow();
    expect(consoleErrors).toHaveLength(0);
  });

  test('playExplosion() does not throw when audioEnabled is false', async ({ page }) => {
    await expect(page.evaluate(() => {
      window.audioEnabled = false;
      playExplosion();
    })).resolves.not.toThrow();
    expect(consoleErrors).toHaveLength(0);
  });

  test('stopThrust() is idempotent — calling it with no prior startThrust() does not throw', async ({ page }) => {
    await expect(page.evaluate(() => {
      window.audioEnabled = false;
      stopThrust(); // first call with no oscillator running
      stopThrust(); // second call — must not crash
    })).resolves.not.toThrow();
    expect(consoleErrors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 5. Wiring — playShoot() called when a bullet fires
  // -------------------------------------------------------------------------

  test('playShoot() is called when the ship fires a bullet', async ({ page }) => {
    // Install spy and disable audio before any keyboard interaction
    await page.evaluate(() => {
      window.audioEnabled = false;
      window._shootCount = 0;
      window.playShoot = () => { window._shootCount++; };
    });

    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.state && window.state.mode === 'PLAYING',
      { timeout: 3000 }
    );

    // Hold Space long enough for at least one update() frame to call ship.fire()
    await page.keyboard.down('Space');
    await page.waitForTimeout(150);
    await page.keyboard.up('Space');
    await page.waitForTimeout(50);

    const count = await page.evaluate(() => window._shootCount);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // 6. Wiring — playExplosion() called on bullet–asteroid collision
  // -------------------------------------------------------------------------

  test('playExplosion() is called when a bullet destroys an asteroid', async ({ page }) => {
    await page.evaluate(() => {
      window.audioEnabled = false;
      window._explosionCount = 0;
      window.playExplosion = () => { window._explosionCount++; };
    });

    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.state && window.state.mode === 'PLAYING' &&
            Array.isArray(window.asteroids) && window.asteroids.length > 0,
      { timeout: 3000 }
    );

    await page.evaluate(() => {
      const a = window.asteroids[0];
      window.bullets.push(new Bullet(a.x, a.y, 0));
    });

    await page.waitForFunction(() => window._explosionCount > 0, { timeout: 2000 });

    const count = await page.evaluate(() => window._explosionCount);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // 7. Wiring — playExplosion() called on ship–asteroid collision
  // -------------------------------------------------------------------------

  test('playExplosion() is called on ship–asteroid collision', async ({ page }) => {
    await page.evaluate(() => {
      window.audioEnabled = false;
      window._explosionCount = 0;
      window.playExplosion = () => { window._explosionCount++; };
    });

    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.state && window.state.mode === 'PLAYING' &&
            Array.isArray(window.asteroids) && window.asteroids.length > 0,
      { timeout: 3000 }
    );

    // Move an asteroid directly onto the ship — next update() detects the collision
    await page.evaluate(() => {
      const a = window.asteroids[0];
      a.x = window.ship.x;
      a.y = window.ship.y;
    });

    await page.waitForFunction(() => window._explosionCount > 0, { timeout: 2000 });

    const count = await page.evaluate(() => window._explosionCount);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // 8. Wiring — startThrust() / stopThrust() on thrust edge transitions
  // -------------------------------------------------------------------------

  test('startThrust() is called exactly once when thrusting begins', async ({ page }) => {
    await page.evaluate(() => {
      window.audioEnabled = false;
      window._thrustStartCount = 0;
      window.startThrust = () => { window._thrustStartCount++; };
    });

    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.state && window.state.mode === 'PLAYING',
      { timeout: 3000 }
    );

    await page.keyboard.down('KeyW');
    await page.waitForTimeout(200); // several frames at 60 fps
    const count = await page.evaluate(() => window._thrustStartCount);
    await page.keyboard.up('KeyW');

    // Must fire exactly once for the rising edge, not every frame
    expect(count).toBe(1);
  });

  test('stopThrust() is called exactly once when thrusting ends', async ({ page }) => {
    await page.evaluate(() => {
      window.audioEnabled = false;
      window._thrustStopCount = 0;
      window.stopThrust = () => { window._thrustStopCount++; };
    });

    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.state && window.state.mode === 'PLAYING',
      { timeout: 3000 }
    );

    await page.keyboard.down('KeyW');
    await page.waitForTimeout(100);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(100); // let the falling edge be detected

    const count = await page.evaluate(() => window._thrustStopCount);
    // Must fire exactly once for the falling edge
    expect(count).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 9. No console errors during gameplay with audioEnabled=false
  // -------------------------------------------------------------------------

  test('no console errors during full gameplay session with audioEnabled=false', async ({ page }) => {
    await page.evaluate(() => { window.audioEnabled = false; });

    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.state && window.state.mode === 'PLAYING' &&
            Array.isArray(window.asteroids) && window.asteroids.length > 0,
      { timeout: 3000 }
    );

    // Thrust, fire, and trigger an explosion
    await page.keyboard.down('KeyW');
    await page.keyboard.down('Space');
    await page.waitForTimeout(200);
    await page.keyboard.up('Space');
    await page.keyboard.up('KeyW');

    await page.evaluate(() => {
      const a = window.asteroids[0];
      window.bullets.push(new Bullet(a.x, a.y, 0));
    });
    await page.waitForTimeout(200);

    expect(consoleErrors).toHaveLength(0);
  });
});
