import { BacklogItem, EnergyLevel, RecommendRequest } from '@/types';

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

  if (item.energy_level === targetEnergy) {
    energyScore = 50;
  } else if (
    (targetEnergy === 'medium' && item.energy_level === 'low') ||
    (targetEnergy === 'high' && item.energy_level === 'medium')
  ) {
    energyScore = 20;
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

    // Time budget filter
    if (item.estimated_minutes > params.availableMinutes) return false;

    // Preferred type filter (if specified and not 'all')
    if (params.preferredType && params.preferredType !== 'all') {
      if (item.type !== params.preferredType) return false;
    }

    return true;
  });

  if (candidates.length === 0) {
    return null;
  }

  // 2. Score candidate items
  const scored = candidates.map((item) => calculateItemScore(item, params.energyState));

  // 3. Sort by score descending (if tied, prefer older items or randomized tiebreak)
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Tie-breaker: older creation date first
    return new Date(a.item.created_at).getTime() - new Date(b.item.created_at).getTime();
  });

  return scored[0] || null;
}
