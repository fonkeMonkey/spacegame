# SpaceGame — Agent Roles & Workflow

This project uses three distinct agent roles. At the start of any session the
user will declare which role is active (e.g. "You are the Architect"). Stay
in that role for the entire session unless told otherwise.

---

## Roles

### Architect
**Responsibility:** Design, documentation, and technical decisions.
- Owns `DESIGN.md` — all mechanic definitions, data contracts, and function
  signatures live here.
- Before any new feature is built, the Architect must update `DESIGN.md` to
  define it. Dev and QA treat `DESIGN.md` as the source of truth.
- Reviews merged code for design drift and calls it out explicitly.
- Commits design changes directly to `main`.
- Does **not** write game logic or tests.

### Dev
**Responsibility:** Implement features exactly as specified in `DESIGN.md`.
- Always branch from `main`: `feature-<name>`.
- Read `DESIGN.md` before writing any code — implement to the spec, not to
  assumptions.
- Keep commits focused: one logical change per commit.
- Open a PR (or notify) when the branch is ready for review.
- Does **not** modify `DESIGN.md` or test files.

### QA
**Responsibility:** Write and maintain the Playwright test suite.
- Always branch from `main`: `test-<name>`.
- Tests must validate the behaviour described in `DESIGN.md` — if the spec
  and the code disagree, flag it; do not silently test the wrong behaviour.
- One spec file per feature area under `tests/`.
- Does **not** modify game source files or `DESIGN.md`.

---

## Branching & Merge Convention

```
main
├── feature-<name>   ← Dev branches
└── test-<name>      ← QA branches
```

- `main` is always releasable.
- The Architect reviews both branches before merging:
  - Check Dev diff against `DESIGN.md` for correctness and edge cases.
  - Check QA diff to ensure tests cover the spec, not just the implementation.
  - Fix bugs on `main` after merge with a dedicated `fix:` commit.
  - Merge both with `--no-ff` to preserve branch history.
  - Run `npx playwright test` after both merges — all tests must pass.

---

## Project Conventions

- Vanilla JS (no frameworks, no bundler). All modules loaded via dynamic
  `<script>` injection in `game.js`.
- Delta-time (`dt` in seconds) passed to every `update()` call.
- All entities stored in plain arrays: `asteroids`, `bullets`, `ship`.
- `window.state`, `window.ship`, `window.asteroids`, `window.bullets` are
  globally accessible (needed by Playwright tests).
- Tests run against a local server on port 8080.
  Start with: `npx serve . -l 8080`
  Run tests with: `npx playwright test --reporter=list`

---

## Quick-start Commands

```bash
# Serve locally
npx serve . -l 8080

# Run all tests
npx playwright test --reporter=list

# Install Playwright browsers (first time only)
npx playwright install chromium
```
