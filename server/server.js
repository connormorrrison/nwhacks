import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '128kb' }));

const PROXY_SECRET = process.env.PROXY_SECRET;
const GEMINI_KEY = process.env.GEMINI_KEY;
const GEMINI_ENDPOINT = process.env.GEMINI_ENDPOINT || process.env.PROXY_TARGET;

if (!PROXY_SECRET) console.warn('Warning: PROXY_SECRET not set. Proxy will reject requests without correct token.');
if (!GEMINI_ENDPOINT) console.warn('Warning: GEMINI_ENDPOINT not set. Configure env to point to Vertex/Gemini endpoint.');

app.post('/api/ai', async (req, res) => {
  const token = req.headers['x-proxy-secret'] || req.body.proxySecret;
  if (!PROXY_SECRET || token !== PROXY_SECRET) return res.status(401).json({ error: 'unauthorized' });

  const { prompt, instances, parameters } = req.body;
  const body = {};
  if (prompt) body.instances = [{ content: prompt }];
  else if (instances) body.instances = instances;
  if (parameters) body.parameters = parameters;

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEMINI_KEY}`
      },
      body: JSON.stringify(body)
    });

    const json = await response.json();
    res.status(response.status).json(json);
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: String(err) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy listening on http://localhost:${port}`));
