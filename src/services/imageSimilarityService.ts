import { PrismaClient } from "@prisma/client";
import { orbService } from "./orbService.js";


const prisma = new PrismaClient() as any;

/**
 * Calculates the Hamming distance between two hex strings representing hashes.
 * It converts hex to binary and counts the differing bits.
 */
export const hammingDistance = (hash1: string, hash2: string): number => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return 100; // Return a large distance if invalid or mismatched lengths (fallback)
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const num1 = parseInt(hash1[i], 16);
    const num2 = parseInt(hash2[i], 16);
    
    // XOR the two numbers and count the set bits (1s)
    let xor = num1 ^ num2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
};

/**
 * Normalizes distance to a score (0 to 1).
 * 16-character hex hashes represent 64 bits.
 */
export const calculateSimilarityScore = (
  inputHashes: { phash: string | null; dhash: string | null },
  dbHashes: { phash: string | null; dhash: string | null }
): number => {
  const MAX_BITS = 64; 

  let phashScore = 0;
  let dhashScore = 0;
  let hasPhash = false;
  let hasDhash = false;

  if (inputHashes.phash && dbHashes.phash) {
    const pDist = hammingDistance(inputHashes.phash, dbHashes.phash);
    phashScore = Math.max(0, 1 - (pDist / MAX_BITS));
    hasPhash = true;
  }

  if (inputHashes.dhash && dbHashes.dhash) {
    const dDist = hammingDistance(inputHashes.dhash, dbHashes.dhash);
    dhashScore = Math.max(0, 1 - (dDist / MAX_BITS));
    hasDhash = true;
  }

  if (hasPhash && !hasDhash) return phashScore;
  if (!hasPhash && hasDhash) return dhashScore;
  
  if (hasPhash && hasDhash) {
    return (phashScore * 0.6) + (dhashScore * 0.4);
  }

  return 0; // fallback if no matching hashes available
};

export const findMatchesAndLog = async (
  newPostId: number,
  newPhash: string | null,
  newDhash: string | null,
  newImageUrl?: string
) => {
  if (!newPhash && !newDhash) return;

  // Check ORB service health early to avoid wasted calls
  const isOrbHealthy = await orbService.checkHealth();
  if (!isOrbHealthy) {
    console.warn("[SIMILARITY] ORB Service is down. Falling back to Hash-only matching.");
  }


  try {
    const existingPosts = await prisma.post.findMany({
      where: {
        id: { not: newPostId },
        OR: [
          { phash: { not: null } },
          { hash: { not: null } }
        ]
      }
    });

    console.log(`\n[SIMILARITY] Checking post ${newPostId} against ${existingPosts.length} posts...`);

    const matches = [];

    for (const p of existingPosts) {
      const hashScore = calculateSimilarityScore(
        { phash: newPhash, dhash: newDhash }, 
        { phash: p.phash, dhash: p.hash }
      );

      let finalScore = hashScore;
      let orbResult = null;

      // ORB Trigger Logic: Run if Hash > 0.6 OR if Hash is moderately high but could be a crop
      // We also verify imageUrl exists for both
      if (isOrbHealthy && newImageUrl && p.imageUrl && (hashScore > 0.6 || hashScore > 0.5)) {
        console.log(`  [ORB] High hash similarity (${hashScore.toFixed(2)}). Running ORB for Post ${p.id}...`);
        orbResult = await orbService.compareWithORB(newImageUrl, p.imageUrl);
        
        if (orbResult.status === "OK") {
           // Smoother Dynamic Weighting
           // orbWeight = min(0.7, orbScore)
           // finalScore = (orbScore * orbWeight) + (hashScore * (1 - orbWeight))
           const orbScore = orbResult.matchScore;
           const orbWeight = Math.min(0.7, orbScore);
           finalScore = (orbScore * orbWeight) + (hashScore * (1 - orbWeight));
           
           console.log(`  [ORB] Match: ${orbScore.toFixed(4)} | Weight: ${orbWeight.toFixed(2)} | Combined: ${finalScore.toFixed(4)}`);
        } else {
           console.log(`  [ORB] Skipped/Failed for Post ${p.id}: ${orbResult.status}`);
        }
      }

      if (finalScore >= 0.65) {
         matches.push({ post: p, score: finalScore, orbInfo: orbResult });
      }
    }


    matches.sort((a, b) => b.score - a.score);

    for (const match of matches) {
      const { post, score } = match;
      
      let strength = "POSSIBLE MATCH (flag for review)";
      if (score > 0.85) strength = "STRONG MATCH (duplicate/repost)";

      console.log(`  -> Match found! Post ${newPostId} <-> Post ${post.id} | Score: ${score.toFixed(4)} | (${strength})`);
      
      await prisma.imageMatch.create({
        data: {
          imageId: newPostId,
          matchedImageId: post.id,
          similarityScore: score
        }
      });
    }

    if (matches.length === 0) {
      console.log(`  -> No similar images found (Max score < 0.65)`);
    }

  } catch (error) {
     console.error("[SIMILARITY ENGINE] Error comparing hashes:", error);
  }
};
