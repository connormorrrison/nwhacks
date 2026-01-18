# Negotiagent

AI-powered Chrome extension that auto-negotiates marketplace listings on Facebook Marketplace using Gemini.

**Features**
- Capture target price & reasoning when creating listings
- Auto-generate negotiation replies using LLM based on seller constraints
- Manage active negotiations in side panel dashboard
- Approve/edit replies before sending

**Tech Stack**
- Chrome Extension MV3 + Plasmo
- React 18 + TypeScript
- Chrome Storage API
- Gemini 2.0 Flash (free model)
- Node.js/Express (optional proxy server)

**Setup**
1. `cd my-extension && npm install && npm run dev`
2. Go to `chrome://extensions` → Enable Developer mode → Load unpacked → select `.plasmo/` folder
3. Open Facebook Marketplace, create listing or add target price in extension side panel
4. Extension injects negotiation UI into marketplace pages and side panel

**Files**
- `sidepanel.tsx` — listing management & negotiation controls
- `src/content/content.js` — FB Marketplace DOM injection
- `lib/llm.ts` — Gemini integration & prompt building
- `src/background/index.ts` — message routing
- `src/options/options.html` — API key configuration