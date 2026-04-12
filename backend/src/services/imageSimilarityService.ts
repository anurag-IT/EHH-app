import { PrismaClient } from "@prisma/client";
import { orbService } from "./orbService.js";

const prisma = new PrismaClient() as any;

/**
 * Calculates the Hamming distance between two hex strings.
 */
export const hammingDistance = (hash1: string, hash2: string): number => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16);
    const n2 = parseInt(hash2[i], 16);
    let xor = n1 ^ n2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
};

function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  let dotProduct = 0, norm1 = 0, norm2 = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2) || 1);
}

export const getSimilarityResults = async (
  targetData: { sha256?: string | null, ahash?: string | null, dhash?: string | null, phash?: string | null, embedding?: string | null, orb?: string | null },
  excludeId?: number
) => {
  console.log(`\n[PIPELINE] Starting similarity analysis...`);

  // --- LAYER 1: EXACT MATCH ---
  if (targetData.sha256) {
    const exactMatches = await prisma.post.findMany({
      where: { sha256: targetData.sha256, id: { not: excludeId || -1 } },
      include: { user: true }
    });
    if (exactMatches.length > 0) {
      return exactMatches.map((m: any) => ({
        post: m,
        totalScore: 100,
        matchType: "EXACT",
        confidenceLevel: "HIGH"
      }));
    }
  }

  // --- LAYER 2: HASH FILTERING ---
  const allPosts = await prisma.post.findMany({
    where: { 
      id: { not: excludeId || -1 },
      OR: [{ phash: { not: null } }, { ahash: { not: null } }, { dhash: { not: null } }]
    },
    include: { user: true }
  });

  let candidates = allPosts.map((p: any) => {
    const pDist = targetData.phash && p.phash ? hammingDistance(targetData.phash, p.phash) : 64;
    const aDist = targetData.ahash && p.ahash ? hammingDistance(targetData.ahash, p.ahash) : 64;
    const dDist = targetData.dhash && p.dhash ? hammingDistance(targetData.dhash, p.dhash) : 64;
    
    const avgDist = (pDist + aDist + dDist) / 3;
    const hashScore = Math.max(0, 100 * (1 - avgDist / 64));
    
    return { post: p, hashScore };
  });

  candidates = candidates
    .filter((c: any) => c.hashScore > 60)
    .sort((a: any, b: any) => b.hashScore - a.hashScore)
    .slice(0, 50);

  if (candidates.length === 0) return [];

  // --- LAYER 3: ORB MATCHING ---
  const isOrbHealthy = await orbService.checkHealth();
  const orbCandidates = candidates.slice(0, 20);
  const newOrb = targetData.orb ? JSON.parse(targetData.orb) : null;

  const results = [];
  for (const c of candidates) {
    let orbScore = 0;
    const isOrbTarget = orbCandidates.some((oc: any) => oc.post.id === c.post.id);
    
    if (isOrbHealthy && isOrbTarget && newOrb && c.post.orb) {
      const targetOrb = JSON.parse(c.post.orb);
      const orbMatch = await orbService.matchDescriptors(
        newOrb.descriptors, newOrb.shape, 
        targetOrb.descriptors, targetOrb.shape
      );
      orbScore = orbMatch.matchScore * 100;
    }
    results.push({ ...c, orbScore });
  }

  // --- LAYER 4: AI EMBEDDING ---
  const aiCandidates = results
    .sort((a: any, b: any) => (b.hashScore * 0.4 + b.orbScore * 0.6) - (a.hashScore * 0.4 + a.orbScore * 0.6))
    .slice(0, 5);
  
  const newVec = targetData.embedding ? JSON.parse(targetData.embedding) : null;

  const finalResults = results.map((r: any) => {
    let aiScore = 0;
    const isAiTarget = aiCandidates.some((ac: any) => ac.post.id === r.post.id);

    if (isAiTarget && newVec && r.post.embedding) {
      const targetVec = JSON.parse(r.post.embedding);
      if (Array.isArray(newVec) && Array.isArray(targetVec)) {
        aiScore = cosineSimilarity(newVec, targetVec) * 100;
      }
    }

    const totalScore = (r.hashScore * 0.3) + (r.orbScore * 0.4) + (aiScore * 0.3);
    
    let matchType = "HASH_MATCH";
    if (r.orbScore > 50) matchType = "ORB_MATCH";
    if (aiScore > 85) matchType = "AI_MATCH";

    let confidenceLevel = "LOW";
    if (totalScore > 85) confidenceLevel = "HIGH";
    else if (totalScore > 70) confidenceLevel = "MEDIUM";

    return { post: r.post, totalScore, matchType, confidenceLevel };
  });

  return finalResults
    .filter((f: any) => f.totalScore > 65)
    .sort((a: any, b: any) => b.totalScore - a.totalScore);
};

export const findMatchesAndLog = async (
  newPostId: number,
  phash: string | null,
  dhash: string | null,
  imageUrl?: string
) => {
  const newPost = await prisma.post.findUnique({ where: { id: newPostId } });
  if (!newPost) return;

  const matches = await getSimilarityResults(newPost, newPostId);

  for (const match of matches) {
    await logMatch(newPostId, match.post.id, match.totalScore, matchTypeMap[match.matchType] || match.matchType);
  }
};

const matchTypeMap: any = {
  "EXACT": "EXACT",
  "HASH_MATCH": "HASH_MATCH",
  "ORB_MATCH": "ORB_MATCH",
  "AI_MATCH": "AI_MATCH"
};

async function logMatch(imageId: number, matchedImageId: number, score: number, type: string) {
  let confidence = "LOW";
  if (score > 85) confidence = "HIGH";
  else if (score > 70) confidence = "MEDIUM";

  console.log(`  -> Match: Post ${imageId} <-> ${matchedImageId} | Score: ${score.toFixed(1)} | Type: ${type} | Confidence: ${confidence}`);
  
  await prisma.imageMatch.create({
    data: {
      imageId,
      matchedImageId,
      similarityScore: score,
      matchType: type,
      confidenceLevel: confidence
    }
  });
}
