import OpenAI from 'openai';

// Lazy initialization to avoid requiring API key at import time
let openai = null;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

// Comprehensive filler words and stopwords to remove from embeddings
const FILLER_WORDS = new Set([
  // Generic work terms
  'work', 'working', 'worked', 'experience', 'experienced', 'years', 'year',
  'help', 'helping', 'helped', 'people', 'person', 'building', 'built', 'build',
  'currently', 'current', 'previously', 'previous',
  
  // Vague descriptors
  'really', 'very', 'quite', 'just', 'things', 'thing', 'stuff',
  'about', 'around', 'through', 'having', 'been', 'being',
  'focused', 'focus', 'focusing', 'looking', 'finding',
  'passionate', 'interested', 'interesting', 'exciting', 'excited',
  'strong', 'deep', 'extensive', 'proven', 'successful', 'effective',
  'significant', 'critical', 'important', 'leading', 'major', 'senior',
  'skilled', 'talented', 'dedicated', 'committed',
  
  // Generic project terms
  'projects', 'project', 'areas', 'area', 'field', 'fields',
  'especially', 'particularly', 'specific', 'specifically',
  'various', 'different', 'multiple', 'several',
  
  // Startup/Tech buzzwords (keeping role-specific terms)
  'innovative', 'innovation', 'innovating', 'disruptive', 'disrupting',
  'leverage', 'leveraging', 'optimize', 'optimizing',
  'synergy', 'agile', 'pivot', 'strategic', 'growth', 'impact',
  'value', 'drive', 'driving', 'enable', 'enabling', 'transform', 'transforming',
  'empower', 'empowering', 'revolutionize', 'revolutionizing', 'disrupt',
  
  // Generic action verbs (keeping role-specific: design, manage, scale, platform, ecosystem)
  'create', 'creating', 'created', 'develop', 'developing', 'developed',
  'implement', 'implementing', 'implemented',
  'deliver', 'delivering', 'delivered',
  'achieve', 'achieving', 'achieved', 'improve', 'improving', 'improved',
  'enhance', 'enhancing', 'enhanced', 'support', 'supporting', 'supported',
  'provide', 'providing', 'provided', 'ensure', 'ensuring', 'ensured',
  
  // Company/Team/Role terms
  'team', 'teams', 'company', 'companies', 'organization', 'organizations',
  'startup', 'startups', 'enterprise', 'role', 'roles', 'position', 'positions',
  'responsible', 'responsibility',
  
  // Results/Metrics fluff
  'outcomes', 'results', 'goals', 'objectives', 'metrics', 'performance',
  'success', 'outcomes',
  
  // Superlatives
  'best', 'leading', 'premier', 'cutting-edge', 'state-of-the-art',
  'world-class', 'best-in-class', 'industry-leading', 'award-winning',
  'next-generation', 'revolutionary', 'groundbreaking',
  
  // Academic/Background terms (keeping education for educators)
  'background', 'degree', 'university', 'college', 'studied', 'graduated',
  'training', 'certification', 'certified', 'qualified',
  
  // Generic problem-solving
  'problem', 'problems', 'solving', 'solve', 'solved', 'challenge', 'challenges',
  'issue', 'issues', 'opportunity', 'opportunities',
  
  // Common articles/prepositions (keep some for context)
  'also', 'additionally', 'furthermore', 'moreover',
  'however', 'therefore', 'thus',
  
  // Time markers
  'recently', 'lately', 'always', 'often', 'sometimes', 'usually'
]);

/**
 * Clean text by removing filler words while preserving meaningful content
 * Preserves technical terms, domain knowledge, and specific skills
 */
export function cleanText(text) {
  if (!text) return '';
  
  // Split into words, clean, and filter
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Keep hyphens for compound terms
    .split(/\s+/)
    .filter(word => {
      // Keep if:
      // 1. Not a filler word
      // 2. Length > 3 (preserve meaningful short terms)
      // 3. Contains numbers (like "web3", "ai/ml")
      return (
        word.length > 3 &&
        !FILLER_WORDS.has(word) &&
        word !== ''
      ) || /\d/.test(word);
    });
  
  return words.join(' ');
}

// Default to small model (1536 dimensions) - cost-effective and performs well
export async function generateEmbedding(text, model = "text-embedding-3-small", cleanFirst = true) {
  // Optionally clean text before embedding
  const inputText = cleanFirst ? cleanText(text) : text;
  
  const response = await getOpenAI().embeddings.create({
    model: model,
    input: inputText
  });
  return response.data[0].embedding;
}

// Large model option (3072 dimensions) - more expensive, didn't improve clustering
export async function generateEmbeddingLarge(text) {
  return generateEmbedding(text, "text-embedding-3-large");
}

// Use 3 identity fields for clustering - background, expertise, interests only
// This ensures "My Clusters" groups similar people, not similar availability
export function buildProfileText(member) {
  // Keep field labels for structure, clean the content
  const background = member.background || '';
  const expertise = member.expertise || '';
  const interests = member.interests || '';
  
  return `
    Background: ${background}
    Expertise: ${expertise}
    Interests: ${interests}
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



