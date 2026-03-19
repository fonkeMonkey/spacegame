# SpaceGame

A browser-based Asteroids-style space shooter built with HTML5 Canvas and vanilla JavaScript. No external dependencies.

## Play

```bash
npx serve . -l 8080
```
Open http://localhost:8080 and press **Enter** to start.

| Control | Action |
|---|---|
| W / Up | Thrust |
| A / Left | Rotate left |
| D / Right | Rotate right |
| Space (hold) | Fire |

---

## Development Workflow

This project uses four autonomous AI agents that cooperate without manual intervention after the initial kickoff.

### Roles

| Agent | Owns | Responsibility |
|---|---|---|
| **PO** | `ROADMAP.md` | Requirements, backlog prioritisation, sign-off |
| **Architect** | `DESIGN.md` | Technical design, specs, merge reviews |
| **Dev** | `feature-*` branches | Implementation |
| **QA** | `test-*` branches | Playwright test suite |

Full role definitions and conventions: [`CLAUDE.md`](CLAUDE.md)

---

### Starting All Agents

```bash
./scripts/start-agents.sh
```

Opens four cmux workspaces (**PO**, **Architect**, **Dev**, **QA**), starts Claude Code in each, and sends the role declaration automatically.

---

### The Autonomous Loop

Once agents are running, give one instruction to the PO. The rest flows automatically via agent-to-agent handoffs using `./scripts/notify.sh`.

```
[You] → PO: "Add <feature> to the roadmap and kick it off"
```

```
PO
 ├─ Writes feature + acceptance criteria to ROADMAP.md
 └─ notify.sh architect "New feature ready for design: <feature>. See ROADMAP.md."

Architect
 ├─ Reads ROADMAP.md requirements
 ├─ Updates DESIGN.md with specs, data contracts, function signatures
 ├─ Commits to main
 ├─ notify.sh dev "DESIGN.md updated for <feature>. Implement on branch feature-<name>."
 └─ notify.sh qa  "DESIGN.md updated for <feature>. Write tests on branch test-<name>."

Dev (in parallel with QA)
 ├─ Reads DESIGN.md
 ├─ Implements on feature-<name> branch
 ├─ Commits and pushes
 └─ notify.sh architect "feature-<name> is ready for review and merge."

QA (in parallel with Dev)
 ├─ Reads DESIGN.md
 ├─ Writes Playwright tests on test-<name> branch
 ├─ Commits and pushes
 └─ notify.sh architect "test-<name> is ready for review and merge."

Architect
 ├─ Reviews both diffs against DESIGN.md
 ├─ Fixes any bugs (dedicated fix: commit)
 ├─ Merges both branches with --no-ff
 ├─ Runs: npx playwright test --reporter=list  (all must pass)
 └─ notify.sh po "Feature <name> merged and tested. Please review against acceptance criteria."

PO
 ├─ Reviews the running game against acceptance criteria
 ├─ Signs off (or raises issues back to Architect)
 └─ notify.sh architect "Feature <name> signed off. Pick up next item from ROADMAP.md if ready."
```

---

### Manual Handoff

Any agent can also be triggered manually at any time:

```bash
./scripts/notify.sh <role> "<message>"
# roles: po | architect | dev | qa
```

---

### Tests

```bash
# Install browsers once
npx playwright install chromium

# Run full suite
npx playwright test --reporter=list
```

---

### Project Structure

```
spacegame/
├── index.html              # Canvas entry point (800×600)
├── CLAUDE.md               # Agent roles, workflow, conventions (auto-loaded)
├── DESIGN.md               # Technical spec — source of truth for Dev and QA
├── ROADMAP.md              # Feature backlog — owned by PO
├── src/
│   ├── game.js             # Main loop, state machine
│   ├── ship.js             # Player ship
│   ├── asteroid.js         # Asteroids + split logic
│   ├── bullet.js           # Bullets
│   ├── input.js            # Keyboard input
│   ├── collision.js        # Circle-circle collision
│   ├── renderer.js         # All draw calls
│   └── utils.js            # Math helpers
├── tests/
│   ├── game.spec.js        # Boot + canvas tests
│   └── asteroids.spec.js   # Asteroid lifecycle tests
├── scripts/
│   ├── start-agents.sh     # Open all four agent workspaces
│   └── notify.sh           # Send a message to an agent by role
└── playwright.config.js
```
