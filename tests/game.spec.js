// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('SpaceGame – canvas & boot', () => {
  /** @type {string[]} */
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    // Wait for the game's `load` listener to fire and scripts to initialise
    await page.waitForFunction(() => typeof window.init === 'function' || window.state !== undefined);
  });

  test('canvas element exists with correct dimensions', async ({ page }) => {
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();

    const width  = await canvas.getAttribute('width');
    const height = await canvas.getAttribute('height');
    expect(Number(width)).toBe(800);
    expect(Number(height)).toBe(600);
  });

  test('canvas has a 2d rendering context', async ({ page }) => {
    const hasCtx = await page.evaluate(() => {
      const c = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'));
      return c !== null && typeof c.getContext === 'function' && c.getContext('2d') !== null;
    });
    expect(hasCtx).toBe(true);
  });

  test('game starts in MENU mode', async ({ page }) => {
    const mode = await page.evaluate(() => window.state && window.state.mode);
    expect(mode).toBe('MENU');
  });

  test('player Ship instantiates after pressing Enter', async ({ page }) => {
    // Press Enter to move from MENU → PLAYING and create the ship
    await page.keyboard.press('Enter');

    // Wait until the ship global is populated
    await page.waitForFunction(() => window.ship != null, { timeout: 3000 });

    const ship = await page.evaluate(() => {
      const s = window.ship;
      if (!s) return null;
      return {
        x:      s.x,
        y:      s.y,
        angle:  s.angle,
        vx:     s.vx,
        vy:     s.vy,
        radius: s.radius,
      };
    });

    expect(ship).not.toBeNull();

    // Ship should spawn at canvas centre (800/2=400, 600/2=300)
    expect(ship.x).toBeCloseTo(400, 0);
    expect(ship.y).toBeCloseTo(300, 0);

    // Default angle pointing up (-π/2)
    expect(ship.angle).toBeCloseTo(-Math.PI / 2, 5);

    // Starts with zero velocity
    expect(ship.vx).toBe(0);
    expect(ship.vy).toBe(0);

    // Collision radius as defined in ship.js
    expect(ship.radius).toBe(14);
  });

  test('game state transitions to PLAYING after Enter', async ({ page }) => {
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.state && window.state.mode === 'PLAYING', { timeout: 3000 });

    const state = await page.evaluate(() => ({
      mode:  window.state.mode,
      score: window.state.score,
      lives: window.state.lives,
      wave:  window.state.wave,
    }));

    expect(state.mode).toBe('PLAYING');
    expect(state.score).toBe(0);
    expect(state.lives).toBe(3);
    expect(state.wave).toBe(0);
  });

  test('no console errors on load or after starting game', async ({ page }) => {
    await page.keyboard.press('Enter');
    // Let a couple of frames run
    await page.waitForTimeout(500);

    expect(consoleErrors).toHaveLength(0);
  });
});
