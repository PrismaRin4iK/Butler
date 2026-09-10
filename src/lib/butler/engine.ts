import { BacklogItem, EnergyLevel, RecommendRequest } from '../../types';

export interface ScoredItem {
  item: BacklogItem;
  score: number;
  breakdown: {
    energyScore: number;
    recentPenalty: number;
    agingBonus: number;
  };
}

/**
 * Calculates recommendation score for an item according to Butler Specification:
 * - Exact energy match: +50
 * - Adjacent energy state (e.g. medium energy allows low): +20
 * - Repeated suggestion penalty (< 24h ago): -30
 * - Aging bonus: +1 per 3 days in backlog (max +20)
 */
export function calculateItemScore(item: BacklogItem, targetEnergy: EnergyLevel): ScoredItem {
  let energyScore = 0;

  if (targetEnergy === 'low') {
    if (item.energy_level === 'low') {
      energyScore = 60; // Perfect match for tired user
    } else if (item.energy_level === 'medium') {
      energyScore = 0; // Allowed only as fallback when no low items exist
    } else {
      energyScore = -1000; // High energy tasks strictly prohibited for an exhausted user
    }
  } else if (targetEnergy === 'medium') {
    if (item.energy_level === 'medium') {
      energyScore = 50; // Exact match for normal pacing
    } else if (item.energy_level === 'low') {
      energyScore = 25; // Light relaxation is totally fine
    } else {
      energyScore = -40; // High energy tasks require full alertness, discourage on medium
    }
  } else {
    // targetEnergy === 'high'
    if (item.energy_level === 'high') {
      energyScore = 70; // Capitalize on peak energy: tackle the hardest tasks!
    } else if (item.energy_level === 'medium') {
      energyScore = 30; // Useful productive work
    } else {
      energyScore = -15; // Don't waste peak energy on passive memes or procrastination
    }
  }

  // Penalty for repeat suggestions in the last 24 hours
  let recentPenalty = 0;
  if (item.last_suggested_at) {
    const hoursSinceLastSuggested =
      (Date.now() - new Date(item.last_suggested_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastSuggested < 24) {
      recentPenalty = -30;
    }
  }

  // Aging bonus: +1 point per 3 days in backlog (maximum +20)
  const createdAtMs = new Date(item.created_at).getTime();
  const daysInBacklog = Math.max(0, Math.floor((Date.now() - createdAtMs) / (1000 * 60 * 60 * 24)));
  const agingBonus = Math.min(20, Math.floor(daysInBacklog / 3));

  const totalScore = energyScore + recentPenalty + agingBonus;

  return {
    item,
    score: totalScore,
    breakdown: {
      energyScore,
      recentPenalty,
      agingBonus,
    },
  };
}

/**
 * Filters items and finds the best recommendation.
 */
export function selectButlerRecommendation(
  items: BacklogItem[],
  params: RecommendRequest
): ScoredItem | null {
  // 1. Hard Filtering
  const candidates = items.filter((item) => {
    // Only items in inbox
    if (item.status !== 'inbox') return false;

    // Filter out excluded items (e.g. current item when skipping)
    if (params.excludeIds && params.excludeIds.includes(item.id)) return false;

    // Time budget filter: cannot exceed user's available window
    if (item.estimated_minutes > params.availableMinutes) return false;

    // Preferred type filter (if specified and not 'all')
    if (params.preferredType && params.preferredType !== 'all') {
      if (item.type !== params.preferredType) return false;
    }

    // STRICT HUMAN-CENTRIC SAFETY FILTER:
    // If the user is exhausted (low energy), NEVER recommend high-energy / heavy tasks!
    if (params.energyState === 'low' && item.energy_level === 'high') {
      return false;
    }

    return true;
  });

  if (candidates.length === 0) {
    return null;
  }

  // 2. Strict Energy Hierarchy:
  // When user is tired ('low'), ALWAYS prefer 'low' energy items if any exist.
  // Never give a 'medium' task to a tired user if there are 'low' energy options!
  let pool = candidates;
  if (params.energyState === 'low') {
    const lowEnergyCandidates = candidates.filter((item) => item.energy_level === 'low');
    if (lowEnergyCandidates.length > 0) {
      pool = lowEnergyCandidates;
    }
  } else if (params.energyState === 'high') {
    // When user is energized ('high'), prioritize 'high' energy items if any exist!
    const highEnergyCandidates = candidates.filter((item) => item.energy_level === 'high');
    if (highEnergyCandidates.length > 0) {
      pool = highEnergyCandidates;
    }
  }

  // 3. Score candidate items
  const scored = pool.map((item) => calculateItemScore(item, params.energyState));

  // 4. Sort by score descending (if tied, prefer older items or randomized tiebreak)
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Tie-breaker: older creation date first
    return new Date(a.item.created_at).getTime() - new Date(b.item.created_at).getTime();
  });

  return scored[0] || null;
}
