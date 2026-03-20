# SpaceGame — Design Document

## Overview
A browser-based Asteroids-style space shooter built with HTML5 Canvas and vanilla JavaScript. The player pilots a ship, destroys asteroids, and avoids collisions. No external dependencies.

---

## Core Mechanics

### Player Ship
- Rotates left/right (arrow keys or A/D)
- Thrusts forward (Up arrow or W) — applies acceleration in facing direction
- Fires bullets (Spacebar) — rate-limited
- Wraps around screen edges
- Dies on asteroid collision; game ends when lives reach 0

### Asteroids
- Spawned at game start and after each wave is cleared
- Three sizes: Large → Medium → Small (split on hit)
- Move in straight lines at random velocities; wrap screen edges
- Small asteroids are destroyed; Large/Medium split into two smaller ones

#### Size Profiles

| Size   | Radius | Speed (px/s)    | Score | Splits into   |
|--------|--------|-----------------|-------|---------------|
| Large  | 40     | 30 – 60         | 20    | 2 × Medium    |
| Medium | 20     | 50 – 100        | 50    | 2 × Small     |
| Small  | 10     | 75 – 150        | 100   | (destroyed)   |

#### Spawning Rules
1. **Wave start** — `spawnWave(n)` places `n` Large asteroids at random positions. Each candidate position is rejected and resampled if it falls within a **120 px exclusion radius** around the ship spawn point (canvas centre), preventing instant collisions.
2. **Split spawn** — when a Large or Medium asteroid is destroyed, two children of the next size are created at the parent's position. Each child receives an independent random angle and speed drawn from its size profile, so they diverge naturally.
3. **Count per wave** — wave 1 starts with 4 Large asteroids; each subsequent wave adds 1 (wave `n` → `3 + n` large asteroids).

#### Movement Vectors
Each asteroid is assigned a velocity vector at construction:
```
angle  = randomRange(0, 2π)          // uniform random direction
speed  = randomRange(min, max)        // from size profile above
vx     = cos(angle) * speed
vy     = sin(angle) * speed
```
Position is integrated each frame with fixed delta time:
```
x += vx * dt
y += vy * dt
```
When `x` or `y` crosses a canvas boundary the position wraps to the opposite edge (`wrapPosition`). Velocity is never altered after construction — asteroids travel in perfectly straight lines.

### Bullets
- Travel in the direction the ship was facing when fired
- Limited lifetime (leave screen or timeout)
- Destroy asteroids on contact

### Particles
- Purely visual — no hitbox, no collision involvement
- Spawned in a burst at the position of an asteroid the moment it is destroyed by a bullet
- Ship–asteroid collisions do **not** spawn particles
- Each burst emits **8–12 particles** (random integer, uniform)
- Each particle receives:
  - A random direction: `angle = randomRange(0, 2π)`
  - A random speed: `speed = randomRange(60, 180)` px/s
  - A random lifetime: `lifetime = randomRange(0.4, 0.8)` seconds
- Position is integrated each frame (same `vx/vy * dt` pattern as asteroids)
- Particles wrap screen edges via `wrapPosition`
- A particle is removed when `lifetime ≤ 0`
- Visual: filled circle, radius 2 px, colour `#ffffff` (white)
- Stored in a global `particles` array; cleared on `resetGame()`

### Scoring

#### Per-asteroid points
| Size   | Points |
|--------|--------|
| Large  | 20     |
| Medium | 50     |
| Small  | 100    |

Score is accumulated in `state.score` during a game. It resets to `0` at the start of each new game (`resetGame()`).

#### High score persistence
- The all-time high score is stored in `localStorage` under the key `'spacegame-highscore'`.
- On `init()`, the stored value is read and placed into `state.highScore` (default `0` if absent or non-numeric).
- When the game transitions to `GAME_OVER` (lives reach 0), `saveHighScore()` is called: if `state.score > state.highScore`, the new value is written to localStorage and `state.highScore` is updated in memory.
- High score is **not** reset when starting a new game — it persists across sessions.

#### Extra life
- Extra life every 10,000 pts (existing mechanic, unchanged).

### Sound Effects

All audio is synthesised via the **Web Audio API** — no external files. A single `AudioContext` is created lazily on the first user `keydown` event to satisfy browser autoplay policy.

**Global flag:** `window.audioEnabled` (boolean, default `true`). Every sound function returns immediately if `window.audioEnabled` is `false` — this silences all audio without destroying the context. Tests set `window.audioEnabled = false` before the game loop runs.

#### Sounds

| Sound     | Trigger                                             | Synthesis                                                              |
|-----------|-----------------------------------------------------|------------------------------------------------------------------------|
| Thrust    | Ship is thrusting (Up/W held)                       | Sawtooth oscillator at 80 Hz, gain 0.3; runs continuously while active |
| Shoot     | Each bullet fired (`ship.fire()` returns a bullet)  | Sine oscillator at 880 Hz; gain envelope: instant attack, decay to 0 in 80 ms |
| Explosion | Asteroid destroyed by bullet; ship–asteroid collision | White-noise `AudioBuffer`, lowpass filter at 800 Hz, gain decays to 0 in 300 ms |

#### AudioContext lifecycle

- Module-level `var audioCtx = null` in `audio.js`.
- `ensureAudio()` — if `audioCtx` is null, construct `new AudioContext()`; if suspended, call `audioCtx.resume()`; return `audioCtx`. Returns `null` when `window.audioEnabled` is false.
- `ensureAudio()` is called at the start of every sound function and also from the `keydown` listener in `init()` (covers the first interaction that creates the context).

#### Thrust state tracking

`game.js` adds a module-level `var prevThrusting = false`. Each `update()` call, after `ship.update()`:
1. If `ship.thrusting && !prevThrusting` → call `startThrust()`.
2. If `!ship.thrusting && prevThrusting` → call `stopThrust()`.
3. `prevThrusting = ship.thrusting`.

This ensures the oscillator starts and stops exactly once per thrust edge, regardless of frame rate.

### Waves
- Each wave increases asteroid count by 1 (starting at 4)
- Brief pause between waves

---

## Folder Structure

```
spacegame/
├── index.html          # Entry point — canvas + script tag
├── DESIGN.md           # This document
└── src/
    ├── game.js         # Main loop, state machine, init
    ├── ship.js         # Player ship entity
    ├── asteroid.js     # Asteroid entity + split logic
    ├── bullet.js       # Bullet entity
    ├── particle.js     # Particle entity (visual debris)
    ├── audio.js        # Web Audio API synthesis (thrust, shoot, explosion)
    ├── input.js        # Keyboard input handler
    ├── collision.js    # Circle-based collision detection
    ├── renderer.js     # All canvas draw calls
    └── utils.js        # Math helpers (wrap, randomRange, vecFromAngle)
```

---

## Key Functions

### `game.js`
| Function | Description |
|---|---|
| `init()` | Set up canvas, create initial entities, bind input, load high score, call `ensureAudio()` on every `keydown`, start loop; set `window.audioEnabled = true` before loop starts |
| `gameLoop(timestamp)` | RAF callback — calls update + render each frame |
| `update(dt)` | Advance all entities, check collisions, manage wave state; detect thrust transitions and call `startThrust()`/`stopThrust()`; call `playShoot()` when a bullet is fired; call `playExplosion()` on bullet–asteroid hit and ship–asteroid collision |
| `spawnWave(count)` | Create `count` large asteroids away from ship |
| `spawnParticles(x, y)` | Emit 8–12 `Particle` objects at `(x, y)`, push to `particles` array |
| `resetGame()` | Restore initial state for new game; resets `state.score` to 0; does **not** reset `state.highScore`; clears `particles` array |
| `loadHighScore()` | Read `'spacegame-highscore'` from localStorage; assign integer to `state.highScore` (default 0 if absent) |
| `saveHighScore()` | If `state.score > state.highScore`, write to localStorage and update `state.highScore` |

### `ship.js`
| Function | Description |
|---|---|
| `Ship(x, y)` | Constructor — position, angle, velocity, lives |
| `ship.update(dt, input)` | Apply thrust/rotation, integrate position, wrap |
| `ship.fire()` | Return a new Bullet if cooldown allows |

### `asteroid.js`
| Function | Description |
|---|---|
| `Asteroid(x, y, size)` | Constructor — position, velocity, radius by size |
| `asteroid.update(dt)` | Move and wrap |
| `asteroid.split()` | Return array of two smaller Asteroids (or empty if Small) |

### `bullet.js`
| Function | Description |
|---|---|
| `Bullet(x, y, angle)` | Constructor — position, velocity from angle |
| `bullet.update(dt)` | Move, decrement lifetime |
| `bullet.isExpired()` | Return true when lifetime <= 0 |

### `particle.js`
| Function | Description |
|---|---|
| `Particle(x, y)` | Constructor — random angle, speed (60–180 px/s), lifetime (0.4–0.8 s); no radius |
| `particle.update(dt)` | Integrate position, decrement lifetime, wrap via `wrapPosition` |
| `particle.isExpired()` | Return true when lifetime <= 0 |

### `audio.js`
| Function | Description |
|---|---|
| `ensureAudio()` | Create `AudioContext` if null; resume if suspended; return context (or `null` if `!window.audioEnabled`) |
| `startThrust()` | Create and start a sawtooth `OscillatorNode` at 80 Hz with gain 0.3; store reference to stop later |
| `stopThrust()` | Stop and disconnect the running thrust oscillator; clear the stored reference |
| `playShoot()` | Create sine oscillator at 880 Hz; apply gain envelope (peak → 0 over 80 ms); auto-disconnect on end |
| `playExplosion()` | Create white-noise `AudioBufferSourceNode`; apply lowpass filter at 800 Hz; gain decays to 0 over 300 ms; auto-disconnect on end |

### `collision.js`
| Function | Description |
|---|---|
| `circleCollides(a, b)` | True if distance between centers < sum of radii |

### `renderer.js`
| Function | Description |
|---|---|
| `drawShip(ctx, ship)` | Draw triangle + thruster flame |
| `drawAsteroid(ctx, asteroid)` | Draw irregular polygon |
| `drawBullet(ctx, bullet)` | Draw small circle/dot |
| `drawParticles(ctx, particles)` | Draw each particle as a white filled circle (radius 2) |
| `drawHUD(ctx, state)` | Score, lives, wave number (top-left during PLAYING) |
| `drawScreen(ctx, w, h, title, subtitle, footer)` | Overlay panel with large title, subtitle, and optional footer line; used for MENU, WAVE_CLEAR, and GAME_OVER |

**Screen content per mode:**
- `MENU`: title=`'SPACEGAME'`, subtitle=`'HIGH SCORE: ' + state.highScore`, footer=`'Press ENTER to start'`
- `GAME_OVER`: title=`'GAME OVER'`, subtitle=`'Score: ' + state.score`, footer=`'Best: ' + state.highScore + '  —  Press ENTER'`
- `WAVE_CLEAR`: title=`'WAVE ' + (state.wave + 1)`, subtitle=`'Get ready...'`, footer=`''`

### `input.js`
| Function | Description |
|---|---|
| `Input()` | Constructor — attaches keydown/keyup listeners |
| `input.isDown(key)` | Return true if key currently held |

### `utils.js`
| Function | Description |
|---|---|
| `wrapPosition(pos, w, h)` | Wrap x/y to opposite side of canvas |
| `randomRange(min, max)` | Uniform random float |
| `vecFromAngle(angle, speed)` | Return {x, y} velocity vector |

---

## Game State Object

`state` is a plain object with the following fields:

| Field       | Type    | Initial value | Description                                  |
|-------------|---------|---------------|----------------------------------------------|
| `mode`      | string  | `'MENU'`      | Current game state (see Game States below)   |
| `score`     | integer | `0`           | Score for the current game                   |
| `highScore` | integer | from localStorage | All-time best score; loaded in `init()` |
| `lives`     | integer | `3`           | Remaining lives                              |
| `wave`      | integer | `0`           | Current wave index (1-based in display)      |
| `wavePause` | float   | `0`           | Seconds remaining in WAVE_CLEAR pause        |

---

## Game States
- `MENU` — title screen; shows high score; press Enter to start
- `PLAYING` — active gameplay
- `WAVE_CLEAR` — brief pause before next wave
- `GAME_OVER` — shows final score and high score; press Enter to restart

---

## Collision Detection

All collision pairs use **circle vs circle** detection. Every entity exposes `x`, `y`, and `radius`.

### Algorithm
```
dx   = a.x - b.x
dy   = a.y - b.y
dist = sqrt(dx*dx + dy*dy)
hit  = dist < (a.radius + b.radius)
```
`sqrt` is used (not squared comparison) for clarity; at < 50 entities per frame the cost is negligible.

### Collision Pairs Checked Each Frame

| Pair | On Hit | Notes |
|---|---|---|
| Bullet → Asteroid | Bullet removed; asteroid split or destroyed; score added | Inner loop breaks after first hit per bullet |
| Ship → Asteroid | Life lost; ship respawns at centre; asteroid survives | Only checked while `state.mode === 'PLAYING'` |

### Ship Hitbox
The ship's collision circle (`radius = 14`) is centred on the ship's position. This is intentionally slightly smaller than the visible triangle (~16 px tip-to-tip) to give the player a small grace margin — a common convention in arcade shooters.

### Asteroid Hitbox
Each asteroid's `radius` matches the value in the size profile table. The visual polygon vertices are generated at up to ±25% of this radius, so the collision circle sits slightly inside the jagged outline — again giving the player a small visual buffer.

### Screen-wrap and Collision
Entities that have just wrapped to the opposite edge retain their position and radius. No special case is needed — collision checks use absolute canvas coordinates and wrap is applied before collision checks each frame.

### Complexity
Bullet–asteroid checks are O(B × A) and ship–asteroid checks are O(A), where B = bullet count and A = asteroid count. Both are bounded: bullets expire after 1.2 s (≤ ~5 active at normal fire rate) and asteroids cap at ~30 per wave after splitting. Total checks per frame ≤ ~150.

---

## Technical Notes
- Target 60 fps via `requestAnimationFrame`
- Delta time (`dt`) in seconds passed to all `update()` calls
- All entities stored in plain arrays; no ECS needed at this scale
- Collision detection is brute-force O(n^2) — fine for < 50 entities
- Web Audio API: single `AudioContext` per session; all sound nodes are created fresh per invocation and disconnected when done (no node leaks); thrust oscillator is the only long-lived node
- `window.audioEnabled = false` is the test harness escape hatch — QA sets this via `page.evaluate` before interacting with the game to prevent audio errors in headless Chromium
