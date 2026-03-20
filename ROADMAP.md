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

### Ready

#### Score persistence

**User story:** As a player, I want my high score saved between sessions so
that I have a personal best to chase and a reason to keep playing.

**Requirements:**
- Track the player's current score during a game: +20 for destroying a large
  asteroid, +50 for medium, +100 for small (classic Asteroids values).
- Display the current score in the HUD during play (top-left corner).
- At game-over, compare the final score to the stored high score in
  `localStorage`. If higher, overwrite it.
- Display the high score on the MENU screen and the GAME_OVER screen.
- On first ever visit (no stored value), high score displays as 0.
- Score resets to 0 at the start of each new game.

**Acceptance criteria:**
- [ ] Destroying a large/medium/small asteroid increments score by 20/50/100.
- [ ] Current score is visible in the HUD during a game.
- [ ] High score is shown on the MENU screen before the first game starts.
- [ ] After game-over with a new high score, refreshing the page still shows
      the updated high score (persisted in localStorage).
- [ ] After game-over with a lower score, the previous high score is unchanged.
- [ ] Score resets to 0 when a new game begins.
- [ ] All existing Playwright tests continue to pass after the feature lands.

### Ideas

| Idea | Description |
|---|---|
| Sound effects | Thrust, shoot, explosion sounds via Web Audio API |
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
