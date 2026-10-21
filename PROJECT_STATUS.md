# Netrunner Digital // Project Status & Collaboration Guide

> [!IMPORTANT]
> **MANDATORY INSTRUCTION FOR ALL AI AGENTS & DEVELOPERS (Antigravity, Claude, etc.):**
> Before starting work, **read this file completely** to understand the architecture, active design decisions, and current progress.
> **Whenever you implement a feature, refactor code, or modify the roadmap, you MUST update this file** (specifically the *Current Status*, *Task Checklist*, and *Changelog* sections) so subsequent agents and developers maintain perfect context continuity.

---

## 1. Project Overview & Rules Reference
This project is an open-source digital implementation of **Android: Netrunner**, adhering strictly to the **Null Signal Games (NSG)** rules and card formats.
* **Local Comprehensive Rulebook (Official PDF):** [`Resources/Rulebook/Null_Signal_Games_Netrunner_Comprehensive_Rules_v26.03.pdf`](Resources/Rulebook/Null_Signal_Games_Netrunner_Comprehensive_Rules_v26.03.pdf) *(Consult this local file for official timing structures, trigger rules, and definitions)*
* **Online Rules Reference:** [Null Signal Games Comprehensive Rules](https://rules.nullsignal.games/)
* **Card Database:** Null Signal Games releases via [NetrunnerDB API v2.0](https://netrunnerdb.com/api/2.0/public/cards)
* **Active Card Pools:**
  * ✅ **System Gateway** (`sg`) — Primary foundation (77 cards)
  * ✅ **Borealis Cycle** (`msbp`, `ms`, `ph`)
  * ✅ **Liberation Cycle** (`tai`, `rwr`)
  * ✅ **Current NSG Sets** (`elev`, `vp`)
  * ❌ **Rotated / Excluded Sets:** System Update 2021 (`su21`), Magnum Opus (`mo`), and older Fantasy Flight Games (FFG) sets are strictly excluded.

---

## 2. Tech Stack & Architecture

### Stack Components
* **Language:** TypeScript 5.7+ (strict mode enabled).
* **Game Core Engine (`src/core/`):** Pure TypeScript, completely decoupled from React and DOM.
  * Deterministic and headless.
  * Can run on the browser client (for zero-latency solo play vs AI) and on Node.js/Bun servers (for authoritative multiplayer).
* **Frontend UI (`src/ui/`, `src/App.tsx`):**
  * **React 19** + **Vite 6**
  * **Tailwind CSS** with custom cyberpunk palette (`cyber-dark`, `cyber-neonCyan`, `cyber-neonPink`, etc.)
  * **Framer Motion** for card transitions (FLIP animations)
  * **Lucide React** for icons
* **Testing:** **Vitest** (fast headless unit testing for game rules and timing interactions).
* **Desktop Executable Target:** Architecture is prepared for **Tauri** packaging to output lightweight Windows `.exe` binaries without modifying web code.

### Architectural Invariants
1. **Never leak hidden information to the client:** In multiplayer, unrezzed cards in Corp servers and cards in R&D/HQ must be stripped before sending state to the Runner.
2. **Headless engine purity:** `src/core/` must never import React, DOM, or browser-specific globals. All state transitions must be pure functions or easily cloneable state operations.
3. **Automated test coverage for rules:** Whenever a new rule or complex card ability is written, add a corresponding test in `tests/`.

---

## 3. Directory Layout

```
Netrunner/
├── PROJECT_STATUS.md                   <-- THIS LIVING DOCUMENT
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── Resources/
│   ├── Rulebook/                       <-- Official NSG Comprehensive Rules PDF (v26.03)
│   │   └── Null_Signal_Games_Netrunner_Comprehensive_Rules_v26.03.pdf
│   └── Cards/
│       └── System Gateway/             <-- Local card assets & high-res images
│           ├── system-gateway-cards.json
│           └── images/                 <-- 77 downloaded card JPGs (named {code}.jpg)
├── src/
│   ├── core/                           <-- Pure TypeScript Game Engine
│   │   ├── types/
│   │   │   ├── card.ts                 <-- Card schema, instances, tokens
│   │   │   ├── state.ts                <-- GameState, CorpState, RunnerState, RunState
│   │   │   └── actions.ts              <-- Legal player actions & types
│   │   └── engine/
│   │       ├── gameState.ts            <-- Initial state creator, shuffle, hand draws
│   │       └── gameEngine.ts           <-- Action executor, turn transitions, run logic
│   ├── data/
│   │   ├── cards.ts                    <-- Typed card lookup utilities
│   │   ├── starterDecks.ts             <-- Starter decks (Catalyst / Syndicate)
│   │   └── system-gateway-cards.json   <-- Bundled card metadata
│   ├── ui/
│   │   └── components/
│   │       ├── CardView.tsx            <-- Card renderer with hover stats & face-down backing
│   │       ├── ServerColumn.tsx        <-- HQ, R&D, Archives, Remotes with Ice stacks
│   │       ├── RigView.tsx             <-- Installed Programs, Hardware, Resources
│   │       ├── RunOverlay.tsx          <-- Real-time run tracker overlay
│   │       └── LogFeed.tsx             <-- Cyberpunk terminal event log
│   ├── App.tsx                         <-- Main interactive tabletop interface
│   ├── main.tsx
│   └── index.css                       <-- Tailwind directives & cyberpunk styles
└── tests/
    └── gameEngine.test.ts              <-- Vitest engine test suite
```

---

## 4. Implementation Roadmap & Status

### Phase 1: Foundational Engine & Gateway Pool (CURRENT)
- [x] Workspace scaffolding (Vite + React 19 + TypeScript + Tailwind + Vitest).
- [x] Download System Gateway cards & images to `Resources/Cards/System Gateway`.
- [x] Core state types (`GameState`, `CorpState`, `RunnerState`, `ServerState`, `RunState`).
- [x] Turn loop & basic click actions (gain credit, draw card, end turn).
- [x] Card installation (Ice on servers, Cards in remote roots, Runner Rig).
- [x] Basic Run initiation and server access logic.
- [x] Automated test suite passing in Vitest (`tests/gameEngine.test.ts`).
- [x] Interactive Tabletop UI with live server columns, rig layout, and log feed.
- [ ] **NEXT:** Implement Ice encounter mechanics (Ice strength, Icebreaker matching, breaking subroutines).
- [ ] **NEXT:** Support Agenda scoring & advancement counters with victory checks.

### Phase 2: Card Ability System & Advanced Timing
- [ ] Implement card effect triggers (e.g., `when_installed`, `when_rezzed`, `on_access`, `trash_ability`).
- [ ] Script core System Gateway icebreakers (Cleaver, Bukhgalter, Carmen, Unity) and Ice (Wall of Static, Enigma, Karuna, etc.).
- [ ] Net damage, Meat damage, and Brain/Core damage resolution.
- [ ] Tagging system and Bad Publicity mechanics.

### Phase 3: Solo AI Opponent
- [ ] Define `Agent` interface (`getAction(gameState, legalActions): Promise<GameAction>`).
- [ ] Build `HeuristicCorpAI`:
  - Evaluate remote scoring opportunities.
  - Prioritize ice installation and rez decisions based on runner threats.
- [ ] Build `HeuristicRunnerAI`:
  - Calculate run safety and break costs.
  - Prioritize icebreaker installations and vulnerable server breaches.
- [ ] Web Worker execution so AI calculation doesn't block the UI thread.

### Phase 4: UI Polish & Animation Juice
- [ ] Framer Motion card sliding from Hand $\rightarrow$ Rig / Server.
- [ ] CSS 3D card flip when cards are rezzed or accessed.
- [ ] Sound effects for clicks, credits, ice rez hum, and run alarms.
- [ ] Full card zoom modal on click/inspect.

### Phase 5: Multiplayer with a Friend
- [ ] Lightweight WebSocket room server (e.g., Node.js + `ws` or Colyseus).
- [ ] Private state scrubbing (Corp cannot see Runner Grip cards; Runner cannot see unrezzed Corp cards).
- [ ] 4-character room codes for instant browser link invitations.

### Phase 6: Desktop Executable Packaging
- [ ] Add Tauri config (`@tauri-apps/cli`).
- [ ] Single-click build for Windows `.exe` release.

---

## 5. Development Commands

* **Start dev server:** `npm run dev` (Runs locally on `http://localhost:3000`)
* **Run unit tests:** `npm test`
* **Run tests in watch mode:** `npm run test:watch`
* **Build production bundle:** `npm run build`
* **Sync/update card assets:** `npm run sync-cards`

---

## 6. Changelog & Agent Work Log

| Date | Agent / Dev | Changes Made |
| :--- | :--- | :--- |
| **2026-10-21** | Antigravity | Initial setup: scaffolded Vite + React 19 + TypeScript + Tailwind workspace; fetched 77 System Gateway cards and high-res images to `Resources/Cards/System Gateway`; built headless rules engine (`src/core/`); implemented basic turn/run actions; wrote passing Vitest test suite; created interactive tabletop UI; authored `PROJECT_STATUS.md`. |
