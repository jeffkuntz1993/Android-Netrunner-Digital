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
4. **Determinism:** All randomness goes through the seeded RNG stored in `GameState.rng` (`src/core/rng.ts`); card instance ids come from `GameState.nextInstanceId`. `src/core/` must never call `Math.random`, `Date.now` or `new Date()`. Same seed + same action list = identical state. `tests/enginePurity.test.ts` enforces this and invariant 2.
5. **Plain-data state:** `GameState` is plain JSON. Card instances store only `cardCode`; look up definitions with `cardDef(card)` / `getCardDefinition(code)` from `src/core/cards.ts`.
6. **One way in:** Every state change goes through `executeAction(state, action)`, which never mutates its input and throws `IllegalActionError` for illegal moves. Use `getLegalActions(state, side)` to drive UI buttons and AI rather than re-implementing rules checks. Import engine APIs from `src/core` (the `index.ts` barrel).
7. **Player decisions are prompts:** When the rules need a player to choose (mulligan, discard to hand size, trash on access, and future "you may" effects), the engine pushes a `Prompt` onto `GameState.pendingPrompts` (`src/core/types/prompts.ts`, `engine/prompts.ts`). While any prompt is pending, the only legal action is `RESOLVE_PROMPT` for the first one, from its side. Multi-step flows (e.g. breach via `activeRun.accessQueue`, end of turn via `finishEndTurn`) must be resumable after the answer. Add new decision types as a new `Prompt` kind + `PromptChoice` + a case in `engine/actions/prompt.ts` + answers in `legalActions.ts`.

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
│   │   ├── index.ts                    <-- Public engine API (import from here)
│   │   ├── rng.ts                      <-- Seeded PRNG (mulberry32) + shuffle
│   │   ├── cards.ts                    <-- Card definition registry (cardDef / getCardDefinition)
│   │   ├── types/
│   │   │   ├── card.ts                 <-- Card schema, instances, tokens
│   │   │   ├── state.ts                <-- GameState, CorpState, RunnerState, RunState
│   │   │   ├── actions.ts              <-- Legal player actions & types
│   │   │   └── prompts.ts              <-- Prompt / PromptChoice types
│   │   └── engine/
│   │       ├── gameState.ts            <-- createInitialGameState(GameSetup): seeded deal
│   │       ├── gameEngine.ts           <-- executeAction: clones state, dispatches to handler table
│   │       ├── legalActions.ts         <-- getLegalActions(state, side)
│   │       ├── errors.ts               <-- IllegalActionError / NotImplementedError
│   │       ├── prompts.ts              <-- pushPrompt / activePrompt (player-choice queue)
│   │       ├── helpers.ts, log.ts      <-- Shared engine utilities
│   │       └── actions/                <-- One module per action group (basic, install, corp, run, turn, prompt)
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
    ├── helpers.ts                      <-- newGame(seed), putInHand(), startRunnerTurn()
    ├── gameEngine.test.ts              <-- Core action tests
    ├── determinism.test.ts             <-- Seeded RNG + replay tests
    ├── legalActions.test.ts            <-- getLegalActions tests
    ├── rulesFixes.test.ts              <-- Regression tests for rules fixes
    ├── prompts.test.ts                 <-- Mulligan, discard, trash-on-access prompts
    └── enginePurity.test.ts            <-- Guards: no Math.random/Date.now/React/DOM in src/core
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
- [x] Engine refactor: seeded RNG in state, deterministic ids, cardCode-only instances, per-action handlers, `getLegalActions`.
- [x] Rules fixes: turn enforcement, install restrictions (no events/operations, no agendas/assets in centrals, one agenda/asset per remote), MU limit, agendas can't be rezzed, ice rezzed only on approach (Corp rez window in run overlay), advancing only advanceable cards, scoring as a separate `SCORE_AGENDA` action, breach accesses HQ (random, seeded) / R&D top / all of Archives, no skipped cards on access, Corp mandatory draw on turn 1.
- [x] Player-choice prompt model (`pendingPrompts` + `RESOLVE_PROMPT`): mulligan (Corp then Runner), discard to hand size at end of turn, pay-to-trash on access. Turns can only end once all clicks are spent. UI: `PromptPanel` modal.
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
- [x] Full card zoom modal on click/inspect and high-res hover popout via Portal.
- [x] Dynamic card scaling system (Normal / Large / Huge) with legible card art and text.

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
* **Replay a specific deal:** open the app with `?seed=<number>` (the current seed is shown in the header).

---

## 6. Changelog & Agent Work Log

| Date | Agent / Dev | Changes Made |
| :--- | :--- | :--- |
| **2026-10-21** | Antigravity | Initial setup: scaffolded Vite + React 19 + TypeScript + Tailwind workspace; fetched 77 System Gateway cards and high-res images to `Resources/Cards/System Gateway`; built headless rules engine (`src/core/`); implemented basic turn/run actions; wrote passing Vitest test suite; created interactive tabletop UI; authored `PROJECT_STATUS.md`. |
| **2026-10-21** | Antigravity | Enhanced visual readability & fixed pop-outs: copied 77 local card images to `public/cards/`; increased card dimensions across tabletop by 2x–3x with dynamic scaling toggle (Normal/Large/Huge); removed obscuring dark gradient on card images; fixed Corp pop-out bug by creating a Portal-based `CardPopout` with viewport boundary clamping; resolved Rez button mouse event interception in `ServerColumn`; allowed Corp players to peek at unrezzed cards and inspect abilities; added interactive Corp and Runner Identity inspect previews and full-screen `CardZoomModal`. |
| **2026-10-21** | Antigravity | Fixed action overflow bug: separated active turn action controls into dedicated toolbars; added `min-w-0` to all flex containers to prevent large cards from expanding past the screen; anchored "End Turn" button cleanly within the UI and added a quick "End Turn" button to the sticky top header. |
| **2026-10-21** | Claude | Engine refactor (no rules changes): seeded mulberry32 RNG stored in `GameState.rng`, deterministic instance ids, removed `Date.now`/`Math.random` from core; card instances now store only `cardCode` (definitions via `cardDef()`); split `executeAction` into a typed per-action handler table under `engine/actions/` with `IllegalActionError`/`NotImplementedError`; added `getLegalActions`/`isLegalAction` and a `src/core/index.ts` barrel; UI shows the seed and accepts `?seed=`; added determinism, legal-action and engine-purity tests; `tests/` now typechecked. |
| **2026-10-21** | Claude | Rules-bug fixes: turn/run enforcement on every action; install restrictions + MU limit; agendas unrezzable; ice rez only while approached (Corp rez button in `RunOverlay`); new `SCORE_AGENDA` action replaces auto-score, advance limited to agendas and "You can advance this" cards; breach collects candidates first (fixes skipped cards) and accesses HQ/R&D/Archives; Runner can't draw from an empty Stack; Corp mandatory draw on turn 1; Advance/Score/Rez buttons in `ServerColumn` driven by `isLegalAction`; 18 regression tests in `tests/rulesFixes.test.ts`. |
| **2026-10-21** | Claude | Player-choice prompts: `GameState.pendingPrompts` queue + `RESOLVE_PROMPT` action (only legal action while a prompt is pending); mulligan at setup (Corp first turn and its mandatory draw start after both decide; clicks start at 0); END_TURN requires all clicks spent and prompts a discard when over hand size; breach is now a resumable `accessQueue` with a pay-to-trash prompt for cards with a trash cost (not in Archives); `getLegalActions` enumerates prompt answers; new `PromptPanel` UI and disabled End Turn buttons; `tests/prompts.test.ts` (66 tests total). |
