# Marketplace Negotiation Extension

This Chrome extension helps sellers on online marketplaces (e.g., Facebook Marketplace) automate and manage price negotiations using an LLM-driven negotiation engine. It prompts you when creating listings for your target (final) price and reasoning, then uses that guidance to negotiate with buyers in seller chats when you enable auto-negotiation.

**Goals**
- Help sellers preserve asking price objectives while offloading repetitive negotiation messages.
- Keep sellers informed with a lightweight dashboard of active negotiations and statuses.
- Let sellers opt-in per-conversation and retain control over offers and final acceptance.

**Key Features**
- When creating a listing: asks for the final price you want and the reason (why that price is fair).
- In seller chat: on clicking a buyer message, prompts which listing the message belongs to and whether to auto-negotiate.
- Auto-negotiation: if enabled, the extension responds and counters automatically based on your target price and strategy.
- Dashboard: shows each negotiation with buyer name, product name, asking price, your target (selling) price, most recent chat snippet, and current status (actively negotiating, waiting for response, completed, paused).
- Configurable prompts and strategy via the extension options page.

How it Works
-------------
1. Listing creation: the extension augments the listing flow to capture two values:
   - Final selling price (the minimum you're willing to accept).
   - Short justification or reasoning (used by the LLM to argue value/justification).
2. Seller chat: when you open a message thread and click a message, the extension asks which listing the conversation is about. After selecting the listing, it asks whether to auto-negotiate. If you confirm, the negotiation engine runs.
3. Negotiation engine: uses message parsing and an LLM to generate offers, counters, and polite persuasion messages constrained by your target price and negotiation strategy. Messages are sent either automatically or prepared for your review depending on your preferences.
4. Dashboard & state: negotiation sessions are recorded and shown in the dashboard with metadata and a recent-message preview. Session state indicates whether the system is actively waiting for buyer reply, sending a counteroffer, or paused.

Privacy & Data Handling
-----------------------
- Local-first: default design stores negotiation state and listing metadata locally using the extension storage helper.
- Configurable remote APIs: if you enable a cloud LLM provider or telemetry, the extension will ask for explicit configuration and consent.
- Minimal sharing: only message text needed for prompt/context is sent to the selected LLM provider when generating replies; no contact lists or unrelated data are uploaded.

Architecture & Files
--------------------
- `manifest.json` — extension registration and permissions.
- `src/content/content.js` — DOM injection and marketplace UI hooks.
- `src/content/fb-marketplace-injector.js` — FB Marketplace-specific selectors and event wiring.
- `src/api/ai-client.js` — LLM client wrapper and prompt management.
- `src/api/negotiation-engine.js` — negotiation state machine, offer logic, and message generation.
- `src/background/service-worker.js` — background tasks, alarms, and cross-tab messaging.
- `src/options/options.html` & `.js` — configuration for LLM provider, strategy, and prompts.
- `utils/storage-helper.js` — persistence helpers and migration utilities.

Developer Setup
---------------
1. Clone the repo and open in VS Code.
2. Load the extension in Chrome via `chrome://extensions` → "Load unpacked" and select the `my-extension` directory.
3. For local development, open the console on the marketplace pages and watch content script logs.

Usage Walkthrough
-----------------
- Creating a listing: when you create a new listing, the extension shows two extra input prompts: "Target selling price" and "Why this price is fair". Fill both — they will drive negotiation behavior.
- Responding to messages: when a buyer messages you, click the message. The extension will ask which listing the message is about. Choose the listing and whether to enable auto-negotiation. If enabled, negotiation begins automatically.
- Dashboard: open the extension popup or options dashboard to see active negotiation cards with buyer, product, asking price, your target price, recent message, and status.

LLM & Prompting
----------------
- The extension uses a prompt template that combines the listing's target price, your justification, the conversation history, and configurable negotiation strategy (e.g., "firm", "friendly", "split the difference").
- Prompt templates live in `assets/prompts/negotiation-prompts.json` and can be edited from the options page.

Safety & Controls
-----------------
- Manual review option: you can choose to have each generated reply shown for approval before sending.
- Stop negotiation: you can pause or cancel any active negotiation from the dashboard.

Next Steps (you asked for these later)
-------------------------------------
- Implement a UI flow for capturing listing target price and reasoning.
- Wire `negotiation-engine.js` to `ai-client.js` with a safe prompt template.
- Build the dashboard UI and wire storage to persist negotiation sessions.

If you want, I can start implementing the first step: wire the listing-creation prompts and persist the listing metadata. Tell me which step to start next.

Team Assignments
----------------
Below is a suggested division of the remaining work between four team members. Assign names as you prefer.

- **Member 1 — Frontend (Listing & Chat UI)**
   - Implement listing-creation UI that collects `targetPrice` and `priceReason` and injects it into the marketplace listing flow (`src/content/fb-marketplace-injector.js`, `src/content/content.js`).
   - Build the per-thread modal that prompts which listing a buyer message belongs to and an opt-in toggle for auto-negotiate.
   - Acceptance: inputs visible and values emitted to storage API; modal appears on message click.

- **Member 2 — Storage & Options**
   - Implement listing/session persistence in `utils/storage-helper.js` (CRUD APIs for listings and negotiation sessions).
   - Build the options UI (`src/options/options.html` & `.js`) to view/edit listings, configure provider keys, and edit prompt templates.
   - Acceptance: listings persist across reloads; options UI reads/writes storage.

- **Member 3 — Negotiation Engine & LLM**
   - Implement `src/api/negotiation-engine.js` (session state machine, counteroffer rules, timers, status transitions).
   - Implement `src/api/ai-client.js` to call the chosen LLM provider, apply prompt templates (`assets/prompts/negotiation-prompts.json`), and handle retries/rate-limits.
   - Acceptance: negotiation engine can produce a candidate reply from the LLM given a session context and obey `targetPrice` constraints.

- **Member 4 — Dashboard, Background & QA**
   - Implement the popup/dashboard (`src/popup/popup.html`, `src/popup/popup.js`) showing negotiation cards (buyer, listing, asking, target, recent message, status) with pause/stop controls.
   - Wire `src/background/service-worker.js` for cross-tab messaging, scheduled follow-ups, and background sending when allowed.
   - Update `manifest.json` and add integration tests and a privacy checklist for QA.
   - Acceptance: dashboard lists active sessions; background worker coordinates auto-sends and updates session state.

Small tasks and cross-cutting concerns (assign to any member): prompt templates and tuning (`assets/prompts/negotiation-prompts.json`), message parsing improvements (`utils/message-parser.js`, `utils/price-analyzer.js`), and end-to-end integration testing.