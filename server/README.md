Proxy server for Negotiation Agent
=================================

This small Node/Express proxy forwards requests from the extension to the Gemini/Vertex endpoint while keeping the real API key on the server (env var).

Setup
-----
1. Copy the root `.env` values or create a new `.env` in `server/` with:

```
GEMINI_KEY=your_gemini_api_key_here
GEMINI_ENDPOINT=https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT/locations/LOCATION/models/MODEL:predict
PROXY_SECRET=some_strong_random_token
PORT=3000
```

2. Install and run:

```bash
cd server
npm install
npm start
```

Usage from the extension
------------------------
- Set the extension options `LLM Endpoint` to `http://<your-server>/api/ai` (e.g., `http://localhost:3000/api/ai`).
- Put the `PROXY_SECRET` value into the extension `LLM API Key` field (the extension will send it as `x-proxy-secret`).

Security notes
--------------
- Keep `PROXY_SECRET` secret; rotate if compromised.
- Add IP/referer restrictions and rate limiting for production use.
