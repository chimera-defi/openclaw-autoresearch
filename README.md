# 🔬 pi-autoresearch

> Autonomous experiment loop for [pi](https://github.com/badlogic/pi) — run, measure, keep or discard, repeat forever.

Inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch). Works for any optimization target: test speed, bundle size, LLM training, build times, Lighthouse scores.

---

![pi-autoresearch dashboard](pi-autoresearch.png)

---

## What's included

| | |
|---|---|
| **Extension** | Tools + live widget + `/autoresearch` dashboard |
| **Skill** | Gathers what to optimize, writes session files, starts the loop |

### Extension tools

| Tool | Description |
|------|-------------|
| `init_experiment` | One-time session config — name, metric, unit, direction |
| `run_experiment` | Runs any command, times wall-clock duration, captures output |
| `log_experiment` | Records result, auto-commits, updates widget and dashboard |

### UI

- **Status widget** — always visible above the editor: `🔬 autoresearch 12 runs 8 kept │ best: 42.3s`
- **`/autoresearch`** — full results dashboard (`Ctrl+X` to toggle, `Escape` to close)

### Skill

`autoresearch-create` asks a few questions (or infers from context) about your goal, command, metric, and files in scope — then writes two files and starts the loop immediately:

| File | Purpose |
|------|---------|
| `autoresearch.md` | Session document — objective, metrics, files in scope, what's been tried. A fresh agent can resume from this alone. |
| `autoresearch.sh` | Benchmark script — pre-checks, runs the workload, outputs `METRIC name=number` lines. |

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

### 1. Start autoresearch

```
/skill:autoresearch-create
```

The agent asks about your goal, command, metric, and files in scope — or infers them from context. It then creates a branch, writes `autoresearch.md` and `autoresearch.sh`, runs the baseline, and starts looping immediately.

### 2. The loop

The agent runs autonomously: edit → commit → `run_experiment` → `log_experiment` → keep or revert → repeat. It never stops unless interrupted.

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
