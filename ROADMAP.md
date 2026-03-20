# SpaceGame — Product Roadmap

Owned by the PO. Features are listed in priority order. The Architect picks
up the next item from "Ready" and translates it into DESIGN.md before Dev
and QA begin work.

---

## Status Key
- `idea` — captured but not yet refined
- `ready` — acceptance criteria written, Architect can design it
- `in progress` — being designed / built / tested
- `done` — merged to main and signed off by PO

---

## Backlog

### Done

| Feature | Notes |
|---|---|
| Player ship movement & shooting | WASD + hold Space to auto-fire |
| Asteroids & collision detection | Three sizes, split on hit, lives system |
| Particle explosions when asteroids are destroyed | 8–12 particles per burst, screen-wrap, visual only |
| Score persistence | Score in HUD, high score on MENU + GAME_OVER, persisted in localStorage |
| Sound effects | Thrust/shoot/explosion via Web Audio API synthesis; audioEnabled flag |

### Ready

**User story:** As a player, I want to hear audio feedback for thrust, shooting,
and explosions so the game feels alive and responsive.

**Requirements:**
- All sounds synthesised via the **Web Audio API** — no external audio files.
- Three distinct sounds:
  - **Thrust:** low rumble while the ship is thrusting (plays continuously
    while Up/W held, stops immediately on key release).
  - **Shoot:** short sharp blip each time a bullet is fired.
  - **Explosion:** brief noise burst each time an asteroid is destroyed (any
    size); also plays on ship–asteroid collision.
- Sounds must not block or delay the game loop.
- Audio context must be created (or resumed) on first user interaction to
  satisfy browser autoplay policy.
- A global `window.audioEnabled` boolean defaults to `true`; setting it to
  `false` silences all sounds (useful for tests and the user preference).

**Acceptance criteria:**
- [ ] Thrust sound starts when the player holds thrust and stops when released.
- [ ] A blip plays each time a bullet is fired.
- [ ] An explosion sound plays each time any asteroid is destroyed by a bullet.
- [ ] An explosion sound plays when the ship collides with an asteroid.
- [ ] No sound plays when `window.audioEnabled = false`.
- [ ] No console errors on load or during gameplay.
- [ ] All existing Playwright tests continue to pass after the feature lands.

### Ideas

| Idea | Description |
|---|---|
| UFO enemy | Periodic UFO that fires at the player |
| Shield power-up | Temporary invincibility pick-up |
| Difficulty scaling | Asteroids get faster as score increases |

---

## How to Add a Feature

1. Move an idea from the Ideas table to **Ready**
2. Write acceptance criteria below the table entry:
   - What the player sees / experiences
   - Any specific numbers or rules (e.g. "UFO appears every 30 s")
   - What "done" looks like
3. Notify the Architect to pick it up
