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

### Ready

_Nothing queued yet — PO to add next feature here._

### Ideas

| Idea | Description |
|---|---|
| Score persistence | Save high score to localStorage |
| Sound effects | Thrust, shoot, explosion sounds via Web Audio API |
| Particle explosions | Visual debris when asteroids are destroyed |
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
