# SDLC Walkthrough Script (GitGuide): Requirements → Deployment

This is a ready-to-read script + “what to show on screen” guide for demonstrating how GitGuide would be developed like a real software product across the full SDLC. It’s written so you can record it as a single video or split it into episodes.

---

## 0) Cold Open (Demo First)

**Narration (say this)**
- “Today I’m going to show you how a real software product is built end-to-end: requirements, design, implementation, testing, and deployment. The project is GitGuide — a local AI-powered Git CLI that turns natural language into safe, deterministic Git commands.”
- “I’ll start with the finished product so you understand the goal, then we’ll rewind and build it properly.”

**On screen (show this)**
- Terminal demo:
  - `gitguide --help`
  - `gitguide init`
  - `gitguide do "create a branch, commit my changes, and push"`
  - `gitguide visualize`
- Browser opens with the visualization dashboard (graph + tables).

**Cut to title card**
- “Building GitGuide: SDLC from Requirements to Deployment”

---

## 1) Requirement Gathering (Discovery)

**Narration**
- “A real project starts by understanding the problem, not writing code.”
- “Git is powerful, but the learning curve is steep. Developers constantly context-switch: searching for commands, remembering flags, and recovering from mistakes.”
- “So the product goal is: use natural language to generate a safe execution plan, confirm with the user, and run real Git commands locally.”

**On screen**
- A simple doc (Markdown / Notion / Google Doc) titled “GitGuide Requirements”.
- Paste a short list of user stories:
  - “As a developer, I can say what I want in plain English and GitGuide creates a step-by-step plan.”
  - “As a developer, I must approve the plan before any command runs.”
  - “As a developer, GitGuide should explain what a Git command does in my repo context.”
  - “As a developer, I want a visual graph of branches/commits.”
  - “As a developer, I want optional GitHub context via MCP, but the tool must still work without it.”

**Artifacts to show**
- MVP scope (must-have):
  - Local-only AI via Ollama
  - Planning engine returns strict JSON
  - Safety confirm/edit/cancel
  - Deterministic execution
- Non-goals (for now):
  - No cloud AI, no server-side analytics
  - Not a full Git GUI replacement

**Requirements checklist (say out loud)**
- Functional:
  - Commands: `do`, `commit`, `push`, `suggest`, `explain`, `visualize`, `init`, `remote-status`
  - Strict JSON plan output
- Non-functional:
  - Privacy-first: run locally by default
  - Safe by design: block dangerous actions
  - Good UX: clear prompts, readable output

---

## 2) Product Spec (Turning Ideas into a Plan)

**Narration**
- “Now we convert goals into something implementable: a spec for inputs/outputs and module boundaries.”
- “The key design choice: AI is used only for planning and explanations — execution is deterministic.”

**On screen**
- A Markdown spec with:
  - CLI commands table (command → purpose → inputs → outputs)
  - Planning output schema (JSON with `plan[]`, each step has `command` + `description`)
  - Safety layer behavior (approve/edit/cancel)
  - Error handling rule: stop on first failure, suggest fix

**Show these repo files**
- `README.md` (problem statement + usage)
- `ARCHITECTURE.md` (system diagram)

---

## 3) Design (Architecture + Threat Modeling)

**Narration**
- “This is where we draw boundaries and protect users from the sharp edges.”
- “Threat model: the AI might hallucinate commands, and Git commands can destroy history. So we add a safety layer and command validation.”

**On screen**
- Architecture diagram (Mermaid in `ARCHITECTURE.md`).
- Walk through modules:
  - CLI Layer (command routing)
  - Repo Context Builder (status, branches, remotes, diffs)
  - Planning Engine (Ollama → strict JSON)
  - Safety Layer (human approval)
  - Execution Engine (runs the plan)
  - Optional MCP Manager (GitHub issues/PRs)

**Design decisions to emphasize**
- Determinism: only `execSync` runs commands; AI never executes.
- Strict JSON: enforce `format: "json"` and validate schema.
- Opt-in integrations: MCP doesn’t break the core tool.
- Generated output: visualization is an HTML file opened locally.

---

## 4) Project Setup (Repository + Tooling)

**Narration**
- “Now we set up the repo like a real open-source project: package config, scripts, dependencies, and conventions.”

**On screen**
- Terminal:
  - `npm init -y`
  - install deps (commander, inquirer, chalk, ora, dotenv, etc.)
- Open `package.json`:
  - show `bin` entry for `gitguide`
  - show scripts (if present)
- Show `.gitignore` to demonstrate security hygiene (ignore `.env`, `.gitguide/`, `graph.html`, etc.).

**What viewers should learn**
- How global CLIs work in Node (bin entry + shebang).
- Why `.env` must never be committed.

---

## 5) Implementation (Build Feature by Feature)

### 5.1 CLI Skeleton

**Narration**
- “First we build the command router. No AI yet — just clean CLI structure.”

**On screen**
- Open:
  - `bin/gitguide.js` (entry point)
  - `src/cli.js` (command registration)
- Run:
  - `gitguide --help`

### 5.2 Repo Context Builder

**Narration**
- “The model can’t plan correctly without context. So we build a context snapshot of the repo.”

**On screen**
- Open `src/repoContext.js`.
- Show that we collect:
  - current branch, status, remotes, recent commits, ahead/behind
- Run:
  - `git status`
  - then show GitGuide output includes status summary

### 5.3 Planning Engine (Ollama)

**Narration**
- “Now we connect to a local model through Ollama.”
- “The most important part: the AI must return strict JSON — no extra words.”

**On screen**
- Open `src/planningEngine.js`:
  - show the request payload to Ollama
  - show strict JSON enforcement
  - show streaming output (so it feels responsive)

**Clip idea**
- Record a run where streaming visibly prints while the plan generates.

### 5.4 Safety Layer

**Narration**
- “This is where we prevent disasters. GitGuide always asks for permission before running anything.”

**On screen**
- Open `src/safetyLayer.js` and show:
  - plan display
  - confirm/edit/cancel prompt
- Run:
  - `gitguide do "reset my branch to origin/main"`
  - show that safety blocks or warns and requires confirmation

### 5.5 Execution Engine

**Narration**
- “Execution is boring on purpose: run steps sequentially, stop on failure.”

**On screen**
- Open `src/executionEngine.js` and show:
  - sequential loop
  - error trapping
- Demo a failure (optional):
  - run a plan that fails intentionally
  - show fix suggestion behavior

### 5.6 Visualization Command

**Narration**
- “Terminal logs don’t scale. So we generate a local dashboard: graph + tables, opened in your browser.”

**On screen**
- Open `src/commands/visualize.js`.
- Run:
  - `gitguide visualize`
- Show browser view:
  - graph view
  - commits table
  - branches overview table

### 5.7 Init Wizard (“like npm init”)

**Narration**
- “To make it feel like a real product, we add an onboarding flow.”

**On screen**
- Open `src/commands/init.js`.
- Run:
  - `gitguide init`
- Show prompts:
  - remote URL
  - enable GitHub MCP or skip
  - token capture saved to `.env`
  - config saved to `.gitguide.config.json`

### 5.8 MCP Integration (Optional GitHub Context)

**Narration**
- “MCP is opt-in. The tool works without it, but if you enable it, GitGuide can read issues/PRs for smarter suggestions.”

**On screen**
- Open:
  - `src/mcpManager.js`
  - `src/commands/remoteStatus.js`
  - `src/config.js`
- Run:
  - `gitguide remote-status`
- Show output listing issues/PRs.

---

## 6) Testing (Quality Gates)

**Narration**
- “Professional software isn’t ‘done’ when it runs once. We add quality gates: linting, formatting, tests, and reproducible builds.”

**On screen (choose what matches your repo)**
- Show `package.json` scripts:
  - `lint`, `test`, `typecheck` (if present)
- If you don’t have automated tests yet:
  - explain the test plan:
    - unit test: safety layer blocks dangerous commands
    - unit test: planning engine JSON parsing + fallback
    - integration test: `gitguide visualize` generates HTML

**What to say**
- “Even if the MVP started without tests, the production path is to add them before a public release.”

---

## 7) Release Management (Versioning + Changelog)

**Narration**
- “Now we ship like a real open-source tool: semantic versioning, tags, and release notes.”

**On screen**
- Show:
  - `git tag v0.1.0`
  - branches like `main`, `dev`, `feature/...`
- Show a `CHANGELOG.md` if you have one, or explain release notes in GitHub Releases.

---

## 8) Deployment (How Users Install It)

**Narration**
- “Deployment for a CLI means: how does a user install and run it?”

**On screen**
- Local install workflow:
  - `npm install`
  - `npm link`
  - `gitguide --help`
- Optional “real deployment” paths to mention:
  - Publish to npm: `npm publish` (public package)
  - GitHub Releases for binaries (later) or `npx` scaffolding (future)

**Call out onboarding**
- “And the first run experience is `gitguide init` — like `npm init` for repositories.”

---

## 9) Maintenance (Backlog + Future Improvements)

**Narration**
- “After launch, we maintain: bug fixes, feature requests, security, and documentation.”

**On screen**
- Show a simple backlog list:
  - `gitguide undo`
  - conflict resolver
  - templates for commit messages
  - more MCP servers (Jira later)
  - CI pipeline

---

## 10) Closing Script (Outro)

**Narration**
- “That’s the complete SDLC walkthrough: we started with requirements, designed safe architecture, implemented iteratively, planned testing, and deployed like a real CLI product.”
- “If you want the source code, it’s open-source — link in description. Subscribe if you want a follow-up where we add CI and publish to npm.”

---

## Recording Checklist (Quick)

- Terminal font size increased (readable on mobile)
- Dark mode contrast checked (browser + terminal)
- Repo is in a clean state for demos (no random local changes)
- Have a “demo repo” with branches/merges ready for `visualize`
- Token safety: blur `.env` and never show real PAT on screen

