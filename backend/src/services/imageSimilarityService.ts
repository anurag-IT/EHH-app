import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient() as any;

/**
 * Calculates the Hamming distance between two hex strings.
 */
export const hammingDistance = (hash1: string, hash2: string): number => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 256;
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

export const getSimilarityResults = async (
  targetData: { phash?: string | null },
  excludeId?: number
) => {
  console.log(`\n[PIPELINE] Starting pHash similarity analysis...`);

  if (!targetData.phash) return [];

  const allPosts = await prisma.post.findMany({
    where: { 
      id: { not: excludeId || -1 },
      phash: { not: null }
    },
    include: { user: true }
  });

  let candidates = allPosts.map((p: any) => {
    const pDist = hammingDistance(targetData.phash as string, p.phash);
    // Convert hamming distance (0-64 bits typically) to a percentage score
    const maxBits = (targetData.phash as string).length * 4;
    const hashScore = Math.max(0, 100 * (1 - pDist / maxBits));
    
    console.log(`[DEBUG MATCH] Post ID: ${p.id} | pDist: ${pDist} | hashScore: ${hashScore}%`);
    
    return { post: p, hashScore };
  });

  // Keep matches above 80% similarity (reduces false positives)
  const finalResults = candidates
    .filter((c: any) => c.hashScore >= 80)
    .sort((a: any, b: any) => b.hashScore - a.hashScore)
    .map((c: any) => {
      let confidenceLevel = "LOW";
      if (c.hashScore >= 95) confidenceLevel = "HIGH";
      else if (c.hashScore >= 85) confidenceLevel = "MEDIUM";

      return {
        post: c.post,
        totalScore: c.hashScore,
        matchType: "HASH_MATCH",
        confidenceLevel
      };
    });

  return finalResults.slice(0, 50);
};

export const findMatchesAndLog = async (
  newPostId: number,
  phash: string | null,
  dhash: string | null,
  imageUrl?: string
) => {
  const newPost = await prisma.post.findUnique({ where: { id: newPostId } });
  if (!newPost) return;

  const matches = await getSimilarityResults({ phash }, newPostId);

  for (const match of matches) {
    await logMatch(newPostId, match.post.id, match.totalScore, match.matchType);
  }
};

async function logMatch(imageId: number, matchedImageId: number, score: number, type: string) {
  let confidence = "LOW";
  if (score >= 95) confidence = "HIGH";
  else if (score >= 85) confidence = "MEDIUM";

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
