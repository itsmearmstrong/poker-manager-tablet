import type { Player, Pot } from '../types/poker';
import { newId } from '../utils/id';

/**
 * Builds main + side pots from player contributions for the current hand.
 * Standard "contribution layer" algorithm: walk the distinct contribution
 * levels (usually created by all-in short stacks) from lowest to highest;
 * each layer is paid into by everyone who contributed at least that deep,
 * and is only winnable by non-folded players who reached that layer.
 */
export function buildPots(players: Player[]): Pot[] {
  const contributors = players.filter((p) => p.totalContribution > 0);
  if (contributors.length === 0) return [];

  const levels = [...new Set(contributors.map((p) => p.totalContribution))].sort((a, b) => a - b);

  const pots: Pot[] = [];
  let prevLevel = 0;

  for (const level of levels) {
    const delta = level - prevLevel;
    prevLevel = level;
    if (delta <= 0) continue;

    const payers = contributors.filter((p) => p.totalContribution >= level);
    const eligible = payers.filter((p) => !p.folded);
    if (eligible.length === 0) continue;

    const amount = delta * payers.length;
    pots.push({
      id: newId(),
      isMain: pots.length === 0,
      amount,
      eligiblePlayerIds: eligible.map((p) => p.id),
    });
  }

  return pots;
}

export function totalPotAmount(pots: Pot[]): number {
  return pots.reduce((sum, p) => sum + p.amount, 0);
}

export function livePotTotal(players: Player[]): number {
  return players.reduce((sum, p) => sum + p.totalContribution, 0);
}

export function amountToCall(currentBetAmount: number, player: Player): number {
  return Math.max(0, currentBetAmount - player.currentBet);
}
