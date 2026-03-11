# 🔬 pi-autoresearch

> Autonomous experiment loop for [pi](https://github.com/badlogic/pi) — run, measure, keep or discard, repeat forever.

Inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch). Works for any optimization target: test speed, bundle size, LLM training, build times, Lighthouse scores.

---

<!-- screenshot -->
<!-- Add screenshot here -->

---

## What's included

| | |
|---|---|
| **Extension** | Tools + live widget + `/autoresearch` dashboard |
| **Meta-skill** | Generates domain-specific skills from a short conversation |

### Extension tools

| Tool | Description |
|------|-------------|
| `init_experiment` | One-time session config — name, metric, unit, direction |
| `run_experiment` | Runs any command, times wall-clock duration, captures output |
| `log_experiment` | Records result, auto-commits, updates widget and dashboard |

### UI

- **Status widget** — always visible above the editor: `🔬 autoresearch 12 runs 8 kept │ best: 42.3s`
- **`/autoresearch`** — full results dashboard (`Ctrl+X` to toggle, `Escape` to close)

### Meta-skill

`/skill:autoresearch-create` asks a few questions and generates a ready-to-use domain skill.

---

## Install

```bash
pi install https://github.com/davebcn87/pi-autoresearch
```

<details>
<summary>Manual install</summary>

```bash
cp -r extensions/pi-autoresearch ~/.pi/agent/extensions/
cp -r skills/autoresearch-create ~/.pi/agent/skills/
```

Then `/reload` in pi.

</details>

---

## Usage

### 1. Generate a domain skill

```
/skill:autoresearch-create
```

Answer a few questions about what you want to optimize. The agent generates and installs a skill like `autoresearch-vitest-speed`.

### 2. Start the loop

```
/skill:autoresearch-vitest-speed
```

The agent enters the experiment loop: edit → commit → `run_experiment` → `log_experiment` → keep or revert → repeat.

### 3. Monitor progress

- **Widget** — always visible above the editor
- **`/autoresearch`** — full dashboard with results table and best run
- **`Escape`** — interrupt anytime and ask for a summary

---

## Example domains

| Domain | Metric | Command |
|--------|--------|---------|
| Test speed | seconds ↓ | `pnpm test` |
| Bundle size | KB ↓ | `pnpm build && du -sb dist` |
| LLM training | val_bpb ↓ | `uv run train.py` |
| Build speed | seconds ↓ | `pnpm build` |
| Lighthouse | perf score ↑ | `lighthouse http://localhost:3000 --output=json` |

---

## How it works

The **extension** is domain-agnostic infrastructure. The **skill** encodes domain knowledge. This separation means one extension serves unlimited domains.

```
┌──────────────────────┐     ┌──────────────────────────┐
│  Extension (global)  │     │  Skill (per-domain)       │
│                      │     │                           │
│  run_experiment      │◄────│  command: pnpm test       │
│  log_experiment      │     │  metric: seconds (lower)  │
│  widget + dashboard  │     │  scope: vitest configs    │
│                      │     │  ideas: pool, parallel…   │
└──────────────────────┘     └──────────────────────────┘
```

Results are persisted to `autoresearch.jsonl` — survives restarts, supports branching, readable by humans.

---

## License

MIT © [Tobi Lutke](https://github.com/tobi), [David Cortés](https://github.com/davebcn87)
