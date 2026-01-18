import { generateReply } from './ai-client.js';

// Basic negotiation engine: prepares a prompt context and returns a candidate reply.
export async function negotiate({ listing, conversationHistory, buyerMessage, strategy = 'friendly' }) {
  if (!listing) throw new Error('Missing listing data for negotiation');
  if (!buyerMessage) throw new Error('Missing buyer message');

  const result = await generateReply({ listing, conversationHistory, buyerMessage, strategy });
  return {
    text: result.text,
    raw: result.raw,
    meta: {
      listingId: listing.id || null,
      strategy
    }
  };
}

export default { negotiate };
