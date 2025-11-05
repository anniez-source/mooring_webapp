import { createClient } from '@supabase/supabase-js';
import { kmeans } from 'ml-kmeans';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const STOP_WORDS = new Set([
  'work', 'working', 'experience', 'years', 'help', 'people', 'building',
  'really', 'think', 'things', 'about', 'through', 'around', 'having',
  'currently', 'reality', 'jasper', 'looking', 'focused', 'focus',
  'passionate', 'interested', 'working', 'projects', 'areas', 'field',
  'especially', 'particularly', 'specific', 'various', 'different'
]);

async function generateClusterLabel(members, keywords) {
  // Sample 5 random members to analyze
  const samples = members.length <= 5 
    ? members 
    : members.sort(() => 0.5 - Math.random()).slice(0, 5);
  
  const profileSummaries = samples.map(m => 
    `- Background: ${m.background?.slice(0, 200) || 'N/A'}
     Expertise: ${m.expertise?.slice(0, 150) || 'N/A'}
     Interests: ${m.interests?.slice(0, 100) || 'N/A'}`
  ).join('\n\n');
  
  const prompt = `You are analyzing a professional community cluster to create a precise, actionable label.

SAMPLE MEMBERS FROM THIS CLUSTER:
${profileSummaries}

TOP KEYWORDS: ${keywords.join(', ')}

Your task: Generate a 2-4 word label that captures:
1. The PRIMARY domain or expertise this group shares
2. Their common FOCUS or approach (if clear from the data)
3. What makes this cluster DISTINCT from generic tech/business groups

Guidelines:
- Be SPECIFIC: "Climate Tech Hardware" not just "Climate Tech"
- Include the TYPE of work: "Solutions", "Innovation", "Development", "Research", etc.
- Avoid overly broad terms like "Technology" or "Business" alone
- Consider what they BUILD, not just what they know
- Make it sound natural and professional

Examples of GOOD labels:
- "Rural Telehealth Platforms"
- "Sustainable Supply Chain Tech"
- "AI-Powered EdTech Solutions"
- "Hardware Climate Innovation"

Examples of BAD labels:
- "Technology" (too broad)
- "Developers" (not specific enough)
- "Business Solutions" (generic)

Return ONLY the label, nothing else. No quotes, no explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 30
    });
    
    const label = response.choices[0].message.content.trim().replace(/['"]/g, '');
    return label || keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);
  } catch (error) {
    console.error('Error generating label:', error.message);
    // Fallback to first keyword capitalized
    return keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);
  }
}

async function detectClustersForAllOrgs() {
  const { data: orgs } = await supabase
    .from('organizations')
    .select('org_id, name');

  if (!orgs || orgs.length === 0) {
    console.log('No organizations found');
    return;
  }

  for (const org of orgs) {
    console.log(`\nProcessing ${org.name}...`);
    await detectClustersForOrg(org.org_id, org.name);
  }
}

async function detectClustersForOrg(orgId, orgName) {
  // Get member IDs for this org
  const { data: members, error: memberError } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('org_id', orgId);

  if (memberError || !members || members.length === 0) {
    console.error(`  Error fetching members:`, memberError);
    return;
  }

  const memberIds = members.map(m => m.user_id);

  // Get profiles with embeddings for these members
  const { data: allProfiles, error } = await supabase
    .from('profiles')
    .select('user_id, name, background, expertise, interests, embedding')
    .in('user_id', memberIds)
    .eq('opted_in', true)
    .not('embedding', 'is', null);
  
  if (error) {
    console.error(`  Error fetching profiles:`, error);
    return;
  }
  
  // Filter out incomplete profiles
  const profiles = allProfiles?.filter(p => {
    const hasBackground = p.background && 
                          p.background.length > 20 && 
                          !p.background.toLowerCase().includes('incomplete') &&
                          !p.background.toLowerCase().includes('profile not complete');
    const hasExpertise = p.expertise && 
                         p.expertise.length > 15 && 
                         !p.expertise.toLowerCase().includes('incomplete') &&
                         !p.expertise.toLowerCase().includes('profile not complete');
    return hasBackground && hasExpertise;
  }) || [];
  
  console.log(`  Filtered to ${profiles.length} members with complete profiles (from ${allProfiles?.length || 0} total)`);

  if (!profiles || profiles.length < 15) {
    console.log(`  Too few complete profiles (${profiles?.length || 0}), skipping clustering`);
    return;
  }

  console.log(`  Clustering ${profiles.length} members...`);

  // Prepare embeddings - ensure they are proper arrays
  const embeddings = profiles.map(p => {
    // Handle case where embedding might be a string or need parsing
    const embedding = typeof p.embedding === 'string' ? JSON.parse(p.embedding) : p.embedding;
    return Array.isArray(embedding) ? embedding : Object.values(embedding);
  });

  // Helper function: calculate distance between two points
  const calculateDistance = (point1, point2) => {
    return Math.sqrt(point1.reduce((sum, val, idx) => sum + Math.pow(val - point2[idx], 2), 0));
  };

  // Quick silhouette score calculation (samples for speed)
  function calculateSilhouetteScoreQuick(embeddings, clusterAssignments) {
    // Sample up to 100 points for faster computation during k-testing
    const sampleSize = Math.min(100, embeddings.length);
    const sampleIndices = [];
    const step = Math.floor(embeddings.length / sampleSize);
    for (let i = 0; i < embeddings.length; i += step) {
      if (sampleIndices.length < sampleSize) sampleIndices.push(i);
    }
    
    const silhouetteScores = [];
    
    // Group points by cluster
    const clusterPoints = {};
    clusterAssignments.forEach((clusterIdx, pointIdx) => {
      if (!clusterPoints[clusterIdx]) clusterPoints[clusterIdx] = [];
      clusterPoints[clusterIdx].push(pointIdx);
    });
    
    // Calculate for sampled points
    sampleIndices.forEach(i => {
      const point = embeddings[i];
      const myCluster = clusterAssignments[i];
      const myClusterPoints = clusterPoints[myCluster];
      
      if (myClusterPoints.length <= 1) {
        silhouetteScores.push(0);
        return;
      }
      
      // a(i): average distance to points in same cluster
      const intraClusterDistances = myClusterPoints
        .filter(j => j !== i)
        .map(j => calculateDistance(point, embeddings[j]));
      const a = intraClusterDistances.reduce((sum, d) => sum + d, 0) / intraClusterDistances.length;
      
      // b(i): minimum average distance to points in other clusters
      const otherClusters = Object.keys(clusterPoints).filter(c => parseInt(c) !== myCluster);
      if (otherClusters.length === 0) {
        silhouetteScores.push(0);
        return;
      }
      
      const interClusterAvgs = otherClusters.map(otherCluster => {
        const otherPoints = clusterPoints[otherCluster];
        const distances = otherPoints.map(j => calculateDistance(point, embeddings[j]));
        return distances.reduce((sum, d) => sum + d, 0) / distances.length;
      });
      const b = Math.min(...interClusterAvgs);
      
      const s = (b - a) / Math.max(a, b);
      silhouetteScores.push(s);
    });
    
    return silhouetteScores.reduce((sum, s) => sum + s, 0) / silhouetteScores.length;
  }

  // Test multiple k values to find optimal clustering
  console.log(`  Testing different cluster counts to optimize quality...`);
  const kValues = [5, 6, 7, 8, 9, 10, 11, 12];
  const silhouetteResults = [];
  
  for (const testK of kValues) {
    const testResult = kmeans(embeddings, testK, { initialization: 'kmeans++' });
    const score = calculateSilhouetteScoreQuick(embeddings, testResult.clusters);
    silhouetteResults.push({ k: testK, score, result: testResult });
    console.log(`    k=${testK}: Silhouette = ${score.toFixed(3)}`);
  }
  
  // Pick the k with the best silhouette score
  const bestResult = silhouetteResults.reduce((best, curr) => 
    curr.score > best.score ? curr : best
  );
  
  const k = bestResult.k;
  const result = bestResult.result;
  
  console.log(`  ✅ Selected k=${k} (best silhouette score: ${bestResult.score.toFixed(3)})\n`);

  // Calculate full silhouette score for final clustering
  function calculateSilhouetteScore(embeddings, clusterAssignments, k) {
    const silhouetteScores = [];
    
    // Group points by cluster
    const clusterPoints = {};
    clusterAssignments.forEach((clusterIdx, pointIdx) => {
      if (!clusterPoints[clusterIdx]) clusterPoints[clusterIdx] = [];
      clusterPoints[clusterIdx].push(pointIdx);
    });
    
    // Calculate silhouette for each point
    embeddings.forEach((point, i) => {
      const myCluster = clusterAssignments[i];
      const myClusterPoints = clusterPoints[myCluster];
      
      // Skip if cluster has only 1 point
      if (myClusterPoints.length <= 1) {
        silhouetteScores.push(0);
        return;
      }
      
      // a(i): average distance to points in same cluster
      const intraClusterDistances = myClusterPoints
        .filter(j => j !== i)
        .map(j => calculateDistance(point, embeddings[j]));
      const a = intraClusterDistances.reduce((sum, d) => sum + d, 0) / intraClusterDistances.length;
      
      // b(i): minimum average distance to points in other clusters
      const otherClusters = Object.keys(clusterPoints).filter(c => parseInt(c) !== myCluster);
      const interClusterAvgs = otherClusters.map(otherCluster => {
        const otherPoints = clusterPoints[otherCluster];
        const distances = otherPoints.map(j => calculateDistance(point, embeddings[j]));
        return distances.reduce((sum, d) => sum + d, 0) / distances.length;
      });
      const b = Math.min(...interClusterAvgs);
      
      // Silhouette score: (b - a) / max(a, b)
      const s = (b - a) / Math.max(a, b);
      silhouetteScores.push(s);
    });
    
    // Return average silhouette score
    const avgScore = silhouetteScores.reduce((sum, s) => sum + s, 0) / silhouetteScores.length;
    return avgScore;
  }

  const silhouetteScore = calculateSilhouetteScore(embeddings, result.clusters, k);
  console.log(`  📊 Silhouette Score: ${silhouetteScore.toFixed(3)} (${getSilhouetteRating(silhouetteScore)})`);
  
  function getSilhouetteRating(score) {
    if (score > 0.7) return '🟢 Excellent clustering';
    if (score > 0.5) return '🟡 Good clustering';
    if (score > 0.25) return '🟠 Weak clustering';
    return '🔴 Poor clustering - consider adjusting k';
  }

  // Filter out outliers: people too far from their cluster center
  const clusterDistances = result.clusters.map((clusterIdx, profileIdx) => ({
    profileIdx,
    clusterIdx,
    distance: calculateDistance(embeddings[profileIdx], result.centroids[clusterIdx])
  }));

  // Calculate mean and std dev of distances per cluster
  const clusterStats = {};
  clusterDistances.forEach(({ clusterIdx, distance }) => {
    if (!clusterStats[clusterIdx]) {
      clusterStats[clusterIdx] = { distances: [] };
    }
    clusterStats[clusterIdx].distances.push(distance);
  });

  Object.keys(clusterStats).forEach(clusterIdx => {
    const distances = clusterStats[clusterIdx].distances;
    const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    clusterStats[clusterIdx].mean = mean;
    clusterStats[clusterIdx].stdDev = stdDev;
    clusterStats[clusterIdx].threshold = mean + (1.5 * stdDev); // 1.5 std devs above mean
  });

  // Filter: Only include members within threshold distance from their cluster
  const goodFit = clusterDistances.filter(({ clusterIdx, distance }) => {
    return distance <= clusterStats[clusterIdx].threshold;
  });

  console.log(`  Filtered ${goodFit.length} good fits from ${clusterDistances.length} total (${clusterDistances.length - goodFit.length} outliers excluded)`);

  // Analyze each cluster with only good-fit members
  const clusters = [];
  
  // Group profiles by their cluster assignment (only good fits)
  const clusterGroups = {};
  goodFit.forEach(({ profileIdx, clusterIdx }) => {
    if (!clusterGroups[clusterIdx]) {
      clusterGroups[clusterIdx] = [];
    }
    clusterGroups[clusterIdx].push(profiles[profileIdx]);
  });

  for (const [idx, members] of Object.entries(clusterGroups)) {
    if (!members || members.length < 3) {
      console.log(`  Cluster ${idx}: Too small (${members?.length || 0}), skipping`);
      continue;
    }
    
    // Extract keywords from cluster members
    const allText = members
      .map(m => `${m.background || ''} ${m.expertise || ''} ${m.interests || ''}`)
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ');
    
    const words = allText.split(/\s+/).filter(w => w.length > 4 && !STOP_WORDS.has(w));
    
    const wordCounts = {};
    words.forEach(w => wordCounts[w] = (wordCounts[w] || 0) + 1);
    
    const topKeywords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
    
    if (topKeywords.length === 0) {
      console.log(`  Cluster ${idx}: No keywords found, skipping`);
      continue;
    }
    
    // Generate AI label for this cluster
    const label = await generateClusterLabel(members, topKeywords);
    
    clusters.push({
      org_id: orgId,
      label,
      keywords: topKeywords.slice(0, 3), // Store top 3 keywords
      memberIds: members.map(m => m.user_id) // Store temporarily for insertion into junction table
    });
  }

  console.log(`  Found ${clusters.length} top-level clusters:`);
  clusters.forEach(c => console.log(`    - ${c.label}: ${c.memberIds.length} members`));

  // Save to database - delete old clusters and their members first
  const { error: deleteError } = await supabase
    .from('community_clusters')
    .delete()
    .eq('org_id', orgId);
  
  if (deleteError) {
    console.error(`  Error deleting old clusters:`, deleteError);
    return;
  }
  
  // Insert top-level clusters first
  if (clusters.length === 0) {
    console.log(`  No clusters to save for ${orgName}`);
    return;
  }
  
  // Insert clusters without member data (it goes in junction table)
  const { data: insertedClusters, error: insertError } = await supabase
    .from('community_clusters')
    .insert(clusters.map(c => ({ 
      org_id: c.org_id,
      label: c.label,
      keywords: c.keywords,
      depth: 0, 
      parent_cluster_id: null 
    })))
    .select('cluster_id, label');
  
  if (insertError) {
    console.error(`  Error inserting clusters:`, insertError);
    return;
  }
  
  console.log(`  ✓ Saved ${clusters.length} top-level clusters`);
  
  // Now insert cluster members into junction table
  const clusterMembersData = [];
  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const insertedCluster = insertedClusters[i];
    
    for (const userId of cluster.memberIds) {
      clusterMembersData.push({
        cluster_id: insertedCluster.cluster_id,
        user_id: userId
      });
    }
  }
  
  if (clusterMembersData.length > 0) {
    const { error: membersError } = await supabase
      .from('cluster_members')
      .insert(clusterMembersData);
    
    if (membersError) {
      console.error(`  Error inserting cluster members:`, membersError);
      return;
    }
    console.log(`  ✓ Saved ${clusterMembersData.length} cluster memberships`);
  }
  
  // Subclustering disabled - only creating top-level clusters
  console.log(`  ✓ All clusters saved (subclustering disabled)`);
}

// Subclustering functionality disabled
// If you want to re-enable subclusters in the future, set parent_cluster_id and depth appropriately

detectClustersForAllOrgs()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

