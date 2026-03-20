// @ts-check
const { test, expect } = require('@playwright/test');

const LS_KEY = 'spacegame-highscore';

test.describe('SpaceGame — score persistence', () => {
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

    // Clear stored high score and sync state.highScore to a known baseline (0)
    await page.evaluate((key) => {
      localStorage.removeItem(key);
      loadHighScore();
    }, LS_KEY);
  });

  // -------------------------------------------------------------------------
  // 1. state.highScore field
  // -------------------------------------------------------------------------

  test('state.highScore is a number on game start', async ({ page }) => {
    const type = await page.evaluate(() => typeof window.state.highScore);
    expect(type).toBe('number');
  });

  test('state.highScore defaults to 0 when localStorage has no entry', async ({ page }) => {
    const highScore = await page.evaluate(() => window.state.highScore);
    expect(highScore).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 2. loadHighScore()
  // -------------------------------------------------------------------------

  test('loadHighScore() reads stored integer from localStorage', async ({ page }) => {
    const highScore = await page.evaluate((key) => {
      localStorage.setItem(key, '1500');
      loadHighScore();
      return window.state.highScore;
    }, LS_KEY);
    expect(highScore).toBe(1500);
  });

  test('loadHighScore() defaults to 0 for a non-numeric stored value', async ({ page }) => {
    const highScore = await page.evaluate((key) => {
      localStorage.setItem(key, 'not-a-number');
      loadHighScore();
      return window.state.highScore;
    }, LS_KEY);
    expect(highScore).toBe(0);
  });

  test('loadHighScore() defaults to 0 when key is absent', async ({ page }) => {
    const highScore = await page.evaluate((key) => {
      localStorage.removeItem(key);
      loadHighScore();
      return window.state.highScore;
    }, LS_KEY);
    expect(highScore).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 3. saveHighScore()
  // -------------------------------------------------------------------------

  test('saveHighScore() writes score to localStorage when score > highScore', async ({ page }) => {
    const stored = await page.evaluate((key) => {
      window.state.score = 800;
      window.state.highScore = 500;
      saveHighScore();
      return localStorage.getItem(key);
    }, LS_KEY);
    expect(stored).toBe('800');
  });

  test('saveHighScore() updates state.highScore in memory when score > highScore', async ({ page }) => {
    const highScore = await page.evaluate(() => {
      window.state.score = 800;
      window.state.highScore = 500;
      saveHighScore();
      return window.state.highScore;
    });
    expect(highScore).toBe(800);
  });

  test('saveHighScore() does NOT write to localStorage when score equals highScore', async ({ page }) => {
    const stored = await page.evaluate((key) => {
      window.state.score = 500;
      window.state.highScore = 500;
      saveHighScore();
      return localStorage.getItem(key);
    }, LS_KEY);
    // Nothing was written — key should still be absent
    expect(stored).toBeNull();
  });

  test('saveHighScore() does NOT write to localStorage when score < highScore', async ({ page }) => {
    const stored = await page.evaluate((key) => {
      window.state.score = 200;
      window.state.highScore = 500;
      saveHighScore();
      return localStorage.getItem(key);
    }, LS_KEY);
    expect(stored).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 4. resetGame()
  // -------------------------------------------------------------------------

  test('resetGame() resets state.score to 0', async ({ page }) => {
    const score = await page.evaluate(() => {
      window.state.score = 1200;
      resetGame();
      return window.state.score;
    });
    expect(score).toBe(0);
  });

  test('resetGame() does NOT reset state.highScore', async ({ page }) => {
    const highScore = await page.evaluate(() => {
      window.state.highScore = 900;
      resetGame();
      return window.state.highScore;
    });
    expect(highScore).toBe(900);
  });

  // -------------------------------------------------------------------------
  // 5. Persistence across page reload
  // -------------------------------------------------------------------------

  test('state.highScore is restored from localStorage on page load', async ({ page }) => {
    // Store a value before the page initialises
    await page.evaluate((key) => localStorage.setItem(key, '2500'), LS_KEY);

    await page.reload();
    await page.waitForFunction(() => window.state !== undefined);

    const highScore = await page.evaluate(() => window.state.highScore);
    expect(highScore).toBe(2500);
  });

  // -------------------------------------------------------------------------
  // 6. GAME_OVER wiring — saveHighScore() called on transition
  // -------------------------------------------------------------------------

  test('reaching GAME_OVER saves a new high score to localStorage', async ({ page }) => {
    // Enter PLAYING
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.state && window.state.mode === 'PLAYING' &&
            Array.isArray(window.asteroids) && window.asteroids.length > 0,
      { timeout: 3000 }
    );

    // Set a score and reduce to 1 life so next collision ends the game
    await page.evaluate(() => {
      window.state.score = 750;
      window.state.highScore = 0;
      window.state.lives = 1;
    });

    // Move an asteroid onto the ship to guarantee a collision on the next frame
    await page.evaluate(() => {
      const a = window.asteroids[0];
      a.x = window.ship.x;
      a.y = window.ship.y;
    });

    await page.waitForFunction(
      () => window.state && window.state.mode === 'GAME_OVER',
      { timeout: 3000 }
    );

    const stored = await page.evaluate((key) => localStorage.getItem(key), LS_KEY);
    expect(stored).toBe('750');
  });

  test('reaching GAME_OVER does not overwrite a higher stored score', async ({ page }) => {
    // Pre-seed a high score in localStorage and in state
    await page.evaluate((key) => {
      localStorage.setItem(key, '9999');
      window.state.highScore = 9999;
    }, LS_KEY);

    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.state && window.state.mode === 'PLAYING' &&
            Array.isArray(window.asteroids) && window.asteroids.length > 0,
      { timeout: 3000 }
    );

    await page.evaluate(() => {
      window.state.score = 100;
      window.state.lives = 1;
    });

    await page.evaluate(() => {
      const a = window.asteroids[0];
      a.x = window.ship.x;
      a.y = window.ship.y;
    });

    await page.waitForFunction(
      () => window.state && window.state.mode === 'GAME_OVER',
      { timeout: 3000 }
    );

    const stored = await page.evaluate((key) => localStorage.getItem(key), LS_KEY);
    expect(stored).toBe('9999');
  });

  // -------------------------------------------------------------------------
  // 7. No console errors
  // -------------------------------------------------------------------------

  test('no console errors during full save/load cycle', async ({ page }) => {
    await page.evaluate((key) => {
      window.state.score = 300;
      window.state.highScore = 0;
      saveHighScore();
      loadHighScore();
    }, LS_KEY);
    expect(consoleErrors).toHaveLength(0);
  });
});
