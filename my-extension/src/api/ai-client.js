/* ai-client.js
   Extension-side client for calling an LLM (Gemini) directly from the extension.
   NOTE: For hackathon/POC only — storing API keys in extension storage is insecure for production.
*/

const DEFAULT_MODEL = 'gemini-1.5-flash';
const MAX_RETRIES = 2;

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'llm_api_key', 'llm_endpoint', 'llm_model', 'llm_system_prompt', 'manual_review'
    ], (res) => {
      resolve({
        apiKey: res.llm_api_key || '',
        endpoint: res.llm_endpoint || '',
        model: res.llm_model || DEFAULT_MODEL,
        systemPrompt: res.llm_system_prompt || '',
        manualReview: !!res.manual_review
      });
    });
  });
}

function redactText(text) {
  // Basic redaction: remove email-like and phone-like tokens
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\+?\d[\d ()-]{6,}\d/g, '[REDACTED_PHONE]');
}

function buildGeminiUrl(config) {
  const defaultBase = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
  let url = config.endpoint || defaultBase;
  if (url.includes('{API_KEY}')) {
    url = url.replace('{API_KEY}', encodeURIComponent(config.apiKey));
    return url;
  }
  if (url.includes('key=')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}key=${encodeURIComponent(config.apiKey)}`;
}

async function callLLM(payload, config) {
  const url = buildGeminiUrl(config);
  const headers = { 'Content-Type': 'application/json' };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`LLM error ${response.status}: ${txt}`);
  }
  return response.json();
}

export async function generateReply({ listing, conversationHistory, buyerMessage, strategy = 'friendly' }) {
  const config = await getConfig();
  if (!config.apiKey) throw new Error('No LLM API key configured in options');

  // Build prompt using template variables
  const { systemPrompt, userPrompt } = buildPrompt(listing, conversationHistory, buyerMessage, strategy, config.systemPrompt);
  const redactedSystem = redactText(systemPrompt);
  const redactedUser = redactText(userPrompt);

  // Gemini generateContent payload
  const payload = {
    system_instruction: { parts: [ { text: redactedSystem } ] },
    contents: [
      { role: 'user', parts: [ { text: redactedUser } ] }
    ],
    generationConfig: { temperature: 0.6, maxOutputTokens: 512 }
  };

  let attempt = 0; let lastErr = null;
  while (attempt <= MAX_RETRIES) {
    try {
      const result = await callLLM(payload, config);
      // Attempt to extract text from common shapes
      if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return { raw: result, text: String(result.candidates[0].content.parts[0].text).trim() };
      }
      if (result?.predictions?.[0]) return { raw: result, text: String(result.predictions[0].content || result.predictions[0]).trim() };
      if (result?.outputs?.[0]) return { raw: result, text: String(result.outputs[0].content || result.outputs[0]).trim() };
      return { raw: result, text: JSON.stringify(result) };
    } catch (err) {
      lastErr = err;
      attempt += 1;
      await new Promise(r => setTimeout(r, 300 * attempt));
    }
  }
  throw lastErr;
}

function buildPrompt(listing, conversationHistory, buyerMessage, strategy, systemPrompt) {
  const listingTitle = listing?.title || 'the item';
  const target = listing?.targetPrice ? `Target price: ${listing.targetPrice}` : 'No explicit target price provided.';
  const reason = listing?.priceReason ? `Seller reasoning: ${listing.priceReason}` : '';

  const history = (conversationHistory || []).slice(-6).map(h => `${h.role}: ${h.text}`).join('\n');

  const system = systemPrompt && systemPrompt.trim()
    ? systemPrompt.trim()
    : 'You are a negotiation assistant for a marketplace seller. Be concise, polite, and persuasive.';

  const user = `Listing: ${listingTitle}
${target}
${reason}

Conversation history:
${history || '(none)'}

Latest buyer message:
${buyerMessage}

Negotiation strategy: ${strategy}

Produce a concise, polite reply that attempts to move the buyer towards the seller's target price while preserving goodwill. If an offer is needed, propose a counteroffer and provide a brief justification. Keep the reply under 120 words.`;

  return { systemPrompt: system, userPrompt: user };
}

export default { generateReply };
