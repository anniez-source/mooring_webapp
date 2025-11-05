import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Default to small model (1536 dimensions) - cost-effective and performs well
export async function generateEmbedding(text, model = "text-embedding-3-small") {
  const response = await openai.embeddings.create({
    model: model,
    input: text
  });
  return response.data[0].embedding;
}

// Large model option (3072 dimensions) - more expensive, didn't improve clustering
export async function generateEmbeddingLarge(text) {
  return generateEmbedding(text, "text-embedding-3-large");
}

// Use original 4 fields - this performs best (score: 0.21-0.26)
export function buildProfileText(member) {
  return `
    Background: ${member.background || ''}
    Expertise: ${member.expertise || ''}
    Interests: ${member.interests || ''}
    How they help: ${member.how_i_help ? member.how_i_help.join(', ') : ''}
  `.trim();
}

// Alternative: Enhanced 7-field version (tested, didn't improve clustering)
export function buildProfileTextEnhanced(member) {
  return `
    Background: ${member.background || ''}
    Expertise: ${member.expertise || ''}
    Interests: ${member.interests || ''}
    How they help: ${member.how_i_help ? member.how_i_help.join(', ') : ''}
    Looking for: ${member.looking_for || ''}
    Open to: ${member.open_to || ''}
    Current work: ${member.current_work || ''}
  `.trim();
}

export function buildContextualQuery(userQuery, userProfile) {
  return `
    Query: ${userQuery}
    Searcher background: ${userProfile.background || ''}
    Searcher expertise: ${userProfile.expertise || ''}
    Searcher interests: ${userProfile.interests || ''}
  `.trim();
}



