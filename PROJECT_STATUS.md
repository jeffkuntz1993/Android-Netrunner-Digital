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
7. **Player decisions are prompts:** When the rules need a player to choose (mulligan, discard to hand size, trash on access, and future "you may" effects), the engine pushes a `Prompt` onto `GameState.pendingPrompts` (`src/core/types/prompts.ts`, `engine/prompts.ts`). While any prompt is pending, the only legal action is `RESOLVE_PROMPT` for the first one, from its side. Multi-step flows (e.g. breach via `activeRun.accessQueue`, end of turn via `finishEndTurn`) must be resumable after the answer. Add new decision types as a new `Prompt` kind + `PromptChoice` + a case in `engine/actions/prompt.ts` + answers in `legalActions.ts`. Card effects use the generic `effect_choice` / `effect_cards` prompts via `askChoice` / `askCards` in `src/core/scripts/effects.ts`.
8. **Card scripts:** Card abilities live in `src/core/scripts/` as a `CardScript` per card code (`canPlay`, `onPlay`, `onPromptAnswer`), registered in `scripts/index.ts`. A card with no script is treated as not implemented (`NotImplementedError`), so it is never offered as a legal play. Each scripted card gets a test in `tests/`.
9. **Ice encounters:** An encounter is `activeRun.encounter` (`iceId`, `broken[]`, per-breaker `boosts`, `resolvingIndex`). While `resolvingIndex` is null the Runner may `BREAK_SUBROUTINE` / `BOOST_BREAKER` / `BIOROID_BREAK`; `CONTINUE_RUN` starts resolving unbroken subroutines in order. A subroutine may queue a prompt; `resolvePrompt` then calls `resumeEncounter` to carry on. Ice and breaker behaviour is data on the card script (`ice: IceScript`, `breaker: BreakerScript` in `scripts/types.ts`); generic logic lives in `engine/ice.ts` and `engine/actions/breaking.ts`. Damage and tags go through `engine/damage.ts`; every way a run ends goes through `endRun` in `engine/runEnd.ts`.
10. **Card abilities (`engine/triggers.ts`, `engine/cardEffects.ts`):** A `CardScript` reacts to game events through `triggers` (`turn_begins`, `installed`, `rezzed`, `advanced`, `agenda_scored`, `agenda_stolen`, `successful_run`, `approach_server`, `run_ends`, `tags_taken`, `trashed_on_access`, `discard_phase_ends`), fired by the engine with `fireTrigger` to every active card (identities, rezzed Corp cards, Corp score area, installed Runner cards). Click and paid abilities are `abilities` used with `USE_ABILITY`; costs (clicks, credits, hosted counters, trash or remove self) are declared and paid by the engine. Constant effects are `modifiers` (memory, hand size, install cost, extra breach accesses, first basic draw); hand size and MU are derived from them, never stored by scripts. Per-turn counters and "once per turn" flags live in `state.turnFlags` (keys in `TurnFlag`), cleared when the turn passes. Hosted credits and virus counters are `card.tokens`. Run-scoped effects (Red Team, Jailbreak, Conduit, Tread Lightly, Overclock) are options on `startRun`. Pay Runner costs with `spendCredits`/`availableCredits` so run-only credits (Overclock) are used.

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
│   │   ├── deckValidation.ts           <-- validateDeck: size, deck limits, influence, agenda points, out-of-faction agendas
│   │   ├── scripts/                    <-- Card abilities: types, effects helpers, operations.ts, events.ts, ice.ts, breakers.ts, corpCards.ts, runnerCards.ts, index.ts registry
│   │   ├── types/
│   │   │   ├── card.ts                 <-- Card schema, instances, tokens
│   │   │   ├── state.ts                <-- GameState, CorpState, RunnerState, RunState
│   │   │   ├── actions.ts              <-- Legal player actions & types
│   │   │   └── prompts.ts              <-- Prompt / PromptChoice types
│   │   └── engine/
│   │       ├── gameState.ts            <-- createInitialGameState(GameSetup): seeded deal
│   │       ├── gameEngine.ts           <-- executeAction: clones state, dispatches to handler table
│   │       ├── legalActions.ts         <-- getLegalActions(state, side)
│   │       ├── ice.ts                  <-- Encounters: strength, subroutine resolution, passing ice
│   │       ├── damage.ts               <-- Net damage (flatline), tags, trashing installed Runner cards
│   │       ├── runEnd.ts               <-- endRun / endTheRun (fires run_ends)
│   │       ├── triggers.ts             <-- activeCards, fireTrigger
│   │       ├── cardEffects.ts          <-- Turn flags, counters, hosted credits, spending, hand size/MU, trash/derez/remove from game, console & unique limits
│   │       ├── errors.ts               <-- IllegalActionError / NotImplementedError
│   │       ├── prompts.ts              <-- pushPrompt / activePrompt (player-choice queue)
│   │       ├── helpers.ts, log.ts      <-- Shared engine utilities
│   │       └── actions/                <-- One module per action group (basic, install, play, corp, run, turn, prompt)
│   ├── data/
│   │   ├── cards.ts                    <-- Typed card lookup utilities
│   │   ├── decks.ts                    <-- Playable decklists (2 official starters + 7 Gateway faction builds), deckGameSetup
│   │   ├── sampleDecks.ts              <-- One-of-each sample decks used by tests (not legal decks)
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
    ├── operationsEvents.test.ts        <-- Playing operations/events + each scripted card
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
- [x] Roadmap M1 — play operations & events: `PLAY_OPERATION_OR_EVENT`, card script registry, effect prompts, run/install-turn tracking. Scripted: Sure Gamble, Creative Commission, VRcation, Wildcat Strike, Mutual Favor, Hedge Fund, Government Subsidy, Hansei Review, Sprint, Predictive Planogram, Seamless Launch. (Full roadmap: https://claude.ai/artifact/HzYaWkAZGsA2ehdMqTGPZW)
- [x] Roadmap M2 — ice & icebreakers: encounters, strength, subtype matching, break/boost, bioroid click-breaks, subroutine resolution with prompts, jack-out timing. Scripted all 11 Gateway ice (Ansel 1.0, Brân 1.0, Diviner, Karunā, Funhouse, Ping, Ballista, Pharos, Palisade, Tithe, Whitespace) and 7 breakers (Buzzsaw, Cleaver, Carmen, Marjanah, Echelon, Unity, Mayfly). Basic net damage and tags pulled forward from M4.
- [x] Roadmap M3 — card ability framework: triggers, `USE_ABILITY` click/paid abilities, once-per-turn tracking, hosted credits and virus counters, hosting programs on ice, lasting modifiers, console and unique limits, derez, remove from game, extra accesses, mid-access abilities, runs started by cards. Scripted every Gateway identity, agenda, asset, upgrade, hardware, resource and remaining program, plus Tread Lightly, Jailbreak and Overclock.
- [x] Roadmap M4 — tags and damage: `REMOVE_TAG`, `TRASH_RESOURCE` (while tagged), `PURGE_VIRUS`; net, meat and core damage with flatline (including max hand size below 0 at the discard step); Urtica Cipher, Clearinghouse, Orbital Superiority, Neurospike, Public Trail, Retribution. Every System Gateway card now has a script (the two starter identities have no text).
- [x] Roadmap M6 — decks: the official Catalyst and Syndicate starter decks, NSG's official System Gateway-only sample decks for the 7 faction identities (44-card Corp, 40-card Runner; from the NSG Getting Started sample decklists page), `validateDeck`, and a deck picker start screen. `?seed=&corp=&runner=` in the URL replays a deal.
- [x] Deckbuilder: create, copy, edit and delete custom decks on the deck picker, with live legality checks; saved in the browser (localStorage).
- [x] Roadmap M7 — UI: Corp installs into any legal server (ice on centrals, upgrades, replacing a remote's card); browsable Archives, Heap, score areas and removed-from-game; view modes (Open table, Pass and play with a hand-off screen and Corp rez windows during runs, Corp view, Runner view) that hide each side's secrets; card flip animations; synthesized sound effects with mute; prompts no longer cover the header.
- [x] Support Agenda scoring & advancement counters with victory checks.

### Phase 2: Card Ability System & Advanced Timing
- [x] Implement card effect triggers (e.g., `when_installed`, `when_rezzed`, `on_access`, `trash_ability`). (Roadmap M3)
- [x] Script core System Gateway icebreakers and ice. (Roadmap M2)
- [x] Net damage, Meat damage, and Brain/Core damage resolution. (Roadmap M4)
- [x] Tagging system. (Roadmap M4; no Gateway card uses Bad Publicity)

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
| **2026-10-22** | Claude | Installed ice is drawn sideways in its server column, as on the table (`ServerColumn`); the hover popout and run overlay still show it upright. |
| **2026-10-22** | Claude | Card hover popout shows the whole card image, uncropped, beside the details (was a cropped art strip that showed the text box on cards with art at the bottom, e.g. Karunā). |
| **2026-10-22** | Claude | Roadmap M7 (UI): `src/ui/viewer.ts` (Viewer/ViewMode, `actingSide`, `corpRezWindow`), `HandoffScreen`, `ZoneViewer`, `src/ui/sound.ts` (Web Audio, picks one sound per action from new log lines), `CorpInstallOptions` in App, flip wrapper in `CardView` (framer-motion), `EncounterPanel` read-only mode, viewer-aware `RunOverlay`/`PromptPanel`. The Runner's basic draw no longer names the drawn cards in the log. Old M8 split into M8 AI, M9 Multiplayer, M10 Desktop. Tests: `tests/viewer.test.ts`. |
| **2026-10-22** | Claude | Faction decks swapped for NSG's official "System Gateway-only" sample lists (Discretion Advised, Advanced Yomi, Hyper Velocity, Quick and Dirty, Party Hard, Stolen Goods, Planning Ahead; https://nullsignal.games/players/getting-started-sample-decklists/). Deckbuilder (`src/ui/components/DeckBuilder.tsx`): New deck / Copy / Edit / Delete on the picker, card pool with search and type/faction filters, live size, influence, agenda points and `validateDeck` problems. Custom decks save to localStorage (`src/data/customDecks.ts`); an illegal deck can be saved but not started. Tests: `tests/customDecks.test.ts`. |
| **2026-10-22** | Claude | Roadmap M6: `src/data/decks.ts` (official starter lists from the NSG System Gateway product page; since replaced by NSG sample lists), `src/core/deckValidation.ts`, `DeckPicker` start screen, App split into picker + `Game`. The old placeholder decks moved to `src/data/sampleDecks.ts` (tests only). `tests/decks.test.ts` validates every deck and plays each Corp deck in a random playout. |
| **2026-10-22** | Claude | Roadmap M4: `dealDamage` (net/meat/core) and `flatline` in `engine/damage.ts`; core damage lowers max hand size and flatlines below 0 at the Runner's discard step; `REMOVE_TAG`, `TRASH_RESOURCE`, `PURGE_VIRUS` basic actions. Scripted Urtica Cipher, Clearinghouse, Orbital Superiority, Neurospike, Public Trail, Retribution: every Gateway card is now scripted. UI: tag and core damage counters, Remove Tag, Purge and Trash-resource buttons. `tests/tagsDamage.test.ts`. |
| **2026-10-22** | Claude | Roadmap M3: `engine/triggers.ts` (active cards, `fireTrigger`) and `engine/cardEffects.ts` (turn flags, counters, hosted credits, `spendCredits`, derived hand size/MU, trash/derez/remove from game, console and unique limits); `USE_ABILITY` action; `startRun` with run options; breach extra accesses; access prompt with mid-access alternatives (Carnivore); "when accessed" hook; hosting via `INSTALL_CARD.hostInstanceId`. Scripted 37 cards in `scripts/corpCards.ts`, `scripts/runnerCards.ts` and `scripts/events.ts`. UI: `AbilityBar`, ability buttons in the encounter panel, counter badges, install-on-ice buttons, access-ability buttons. `tests/abilities.test.ts` and a random-playout stress test (`tests/playout.test.ts`). |
| **2026-10-22** | Claude | Roadmap M2: `EncounterState` on `RunState`; `BREAK_SUBROUTINE` (subroutine indices), `BOOST_BREAKER`, `BIOROID_BREAK`; `IceScript`/`BreakerScript` on card scripts; `engine/ice.ts`, `engine/damage.ts`, `engine/runEnd.ts`, `engine/actions/breaking.ts`; rez hook for ice rezzed mid-run (Ping); install cost modifiers (Carmen); jack out only after passing ice. Scripted 11 ice + 7 breakers. UI: `EncounterPanel` in the run overlay (subroutines, legal break/boost buttons, context-aware Continue label, Jack Out disabled when illegal). `tests/ice.test.ts` (124 tests total). |
| **2026-10-21** | Claude | Roadmap M1: `PLAY_OPERATION_OR_EVENT` basic action (click + cost, card to Archives/heap face up, then effect); `src/core/scripts/` card-script registry (`canPlay`/`onPlay`/`onPromptAnswer`) with generic `effect_choice`/`effect_cards` prompts; `runsThisTurn` and `CardInstance.installedTurn` tracking; `drawCards` helper; `installRunnerCardFrom` for installs from effects. Scripted 11 cards (see roadmap above). UI: Play button for selected operations/events (disabled with "not implemented" for unscripted cards), effect prompts in `PromptPanel`. `tests/operationsEvents.test.ts` (92 tests total). |
