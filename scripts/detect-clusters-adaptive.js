/**
 * Adaptive Clustering Script
 * 
 * This version blends static profile embeddings with dynamic behavior embeddings
 * for continuous learning based on user interactions
 */

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

/**
 * Blend static profile embedding with dynamic behavior embedding
 */
function blendEmbeddings(profileEmbedding, behaviorEmbedding, engagementScore = 0) {
  if (!behaviorEmbedding) return profileEmbedding;
  
  // More engaged users get more weight on behavior (up to 40%)
  const behaviorWeight = Math.min(0.4, 0.2 + engagementScore * 0.002);
  const profileWeight = 1 - behaviorWeight;
  
  return profileEmbedding.map((val, idx) => 
    profileWeight * val + behaviorWeight * behaviorEmbedding[idx]
  );
}

async function generateClusterLabel(members, keywords) {
  const samples = members.length <= 5 
    ? members 
    : members.sort(() => 0.5 - Math.random()).slice(0, 5);
  
  const profileSummaries = samples.map(m => 
    `- Background: ${m.background?.slice(0, 200) || 'N/A'}
     Expertise: ${m.expertise?.slice(0, 150) || 'N/A'}
     Recent Topics: ${m.recent_topics?.slice(0, 3).join(', ') || 'N/A'}`
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
- Consider both their stated expertise AND recent discussion topics
- Make it sound natural and professional

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
    return keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);
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

  // Get profiles with embeddings
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
  
  // Get behavior data for adaptive embeddings
  const { data: behaviors } = await supabase
    .from('user_behavior')
    .select('user_id, avg_embedding, recent_topics, engagement_score')
    .in('user_id', memberIds);

  const behaviorMap = new Map(
    behaviors?.map(b => [b.user_id, b]) || []
  );
  
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
  
  // Enrich profiles with behavior data
  const enrichedProfiles = profiles.map(p => ({
    ...p,
    recent_topics: behaviorMap.get(p.user_id)?.recent_topics || [],
    engagement_score: behaviorMap.get(p.user_id)?.engagement_score || 0
  }));
  
  console.log(`  Filtered to ${enrichedProfiles.length} members with complete profiles (from ${allProfiles?.length || 0} total)`);
  console.log(`  ${behaviors?.length || 0} users have behavioral data`);

  if (!enrichedProfiles || enrichedProfiles.length < 15) {
    console.log(`  Too few complete profiles (${enrichedProfiles?.length || 0}), skipping clustering`);
    return;
  }

  console.log(`  Clustering ${enrichedProfiles.length} members with adaptive embeddings...`);

  // Determine number of clusters
  const k = Math.max(8, Math.min(10, Math.floor(Math.sqrt(enrichedProfiles.length))));
  
  // Create adaptive embeddings (profile + behavior blend)
  const embeddings = enrichedProfiles.map(p => {
    const profileEmbedding = typeof p.embedding === 'string' 
      ? JSON.parse(p.embedding) 
      : p.embedding;
    
    const behavior = behaviorMap.get(p.user_id);
    
    // Blend if behavior embedding exists
    if (behavior?.avg_embedding) {
      return blendEmbeddings(
        profileEmbedding,
        behavior.avg_embedding,
        behavior.engagement_score
      );
    }
    
    return Array.isArray(profileEmbedding) ? profileEmbedding : Object.values(profileEmbedding);
  });
  
  // Run k-means with adaptive embeddings
  const result = kmeans(embeddings, k, { initialization: 'kmeans++' });

  // Calculate distances for outlier detection
  const calculateDistance = (point, centroid) => {
    return Math.sqrt(point.reduce((sum, val, idx) => sum + Math.pow(val - centroid[idx], 2), 0));
  };

  const clusterDistances = result.clusters.map((clusterIdx, profileIdx) => ({
    profileIdx,
    clusterIdx,
    distance: calculateDistance(embeddings[profileIdx], result.centroids[clusterIdx])
  }));

  // Calculate stats per cluster
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
    clusterStats[clusterIdx].threshold = mean + (1.5 * stdDev);
  });

  // Filter outliers
  const goodFit = clusterDistances.filter(({ clusterIdx, distance }) => {
    return distance <= clusterStats[clusterIdx].threshold;
  });

  console.log(`  Filtered ${goodFit.length} good fits from ${clusterDistances.length} total (${clusterDistances.length - goodFit.length} outliers excluded)`);

  // Group by cluster
  const clusterGroups = {};
  goodFit.forEach(({ profileIdx, clusterIdx }) => {
    if (!clusterGroups[clusterIdx]) {
      clusterGroups[clusterIdx] = [];
    }
    clusterGroups[clusterIdx].push(enrichedProfiles[profileIdx]);
  });

  const clusters = [];
  
  for (const [idx, members] of Object.entries(clusterGroups)) {
    if (!members || members.length < 3) {
      console.log(`  Cluster ${idx}: Too small (${members?.length || 0}), skipping`);
      continue;
    }
    
    // Extract keywords from both profiles AND recent topics
    const profileText = members
      .map(m => `${m.background || ''} ${m.expertise || ''} ${m.interests || ''}`)
      .join(' ');
    
    const topicText = members
      .flatMap(m => m.recent_topics || [])
      .join(' ');
    
    const allText = `${profileText} ${topicText}`
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
    
    // Generate label with behavior context
    const label = await generateClusterLabel(members, topKeywords);
    
    clusters.push({
      org_id: orgId,
      label,
      keywords: topKeywords.slice(0, 3),
      memberIds: members.map(m => m.user_id)
    });
  }

  console.log(`  Found ${clusters.length} adaptive clusters:`);
  clusters.forEach(c => console.log(`    - ${c.label}: ${c.memberIds.length} members`));

  // Save to database
  const { error: deleteError } = await supabase
    .from('community_clusters')
    .delete()
    .eq('org_id', orgId);
  
  if (deleteError) {
    console.error(`  Error deleting old clusters:`, deleteError);
    return;
  }
  
  if (clusters.length === 0) {
    console.log(`  No clusters to save for ${orgName}`);
    return;
  }
  
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
  
  console.log(`  ✓ Saved ${clusters.length} adaptive clusters`);
  
  // Insert cluster members
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
  
  console.log(`  ✓ Adaptive clustering complete`);
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

detectClustersForAllOrgs()
  .then(() => {
    console.log('\n✨ Adaptive clustering complete! System is now learning from behavior.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });





