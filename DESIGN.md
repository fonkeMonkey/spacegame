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

### Bullets
- Travel in the direction the ship was facing when fired
- Limited lifetime (leave screen or timeout)
- Destroy asteroids on contact

### Scoring
- Small asteroid: 100 pts
- Medium asteroid: 50 pts
- Large asteroid: 20 pts
- Extra life every 10,000 pts

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
| `init()` | Set up canvas, create initial entities, bind input, start loop |
| `gameLoop(timestamp)` | RAF callback — calls update + render each frame |
| `update(dt)` | Advance all entities, check collisions, manage wave state |
| `spawnWave(count)` | Create `count` large asteroids away from ship |
| `resetGame()` | Restore initial state for new game |

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
| `drawHUD(ctx, state)` | Score, lives, wave number |

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

## Game States
- `MENU` — title screen, press Enter to start
- `PLAYING` — active gameplay
- `WAVE_CLEAR` — brief pause before next wave
- `GAME_OVER` — show score, press Enter to restart

---

## Technical Notes
- Target 60 fps via `requestAnimationFrame`
- Delta time (`dt`) in seconds passed to all `update()` calls
- All entities stored in plain arrays; no ECS needed at this scale
- Collision detection is brute-force O(n^2) — fine for < 50 entities
