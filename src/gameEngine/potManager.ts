import type { Player, Pot } from '../types/poker';
import { newId } from '../utils/id';

/**
 * Builds main + side pots from player contributions for the current hand.
 * Walks the distinct contribution levels from lowest to highest, accumulating
 * each layer's amount and eligible (non-folded) payers into a running pot.
 * A side pot is only cut off where a *genuine* cap exists — an active,
 * non-folded player going all-in at that level. Levels created merely by a
 * fold, or by a player who simply hasn't matched the current bet yet, don't
 * split the pot; they fold into the pot above them instead. This matters
 * because buildPots reruns after every action, not just at all-ins, so most
 * of the levels it sees mid-round are just "hasn't acted yet," not real caps.
 */
export function buildPots(players: Player[]): Pot[] {
  const contributors = players.filter((p) => p.totalContribution > 0);
  if (contributors.length === 0) return [];

  const levels = [...new Set(contributors.map((p) => p.totalContribution))].sort((a, b) => a - b);
  const allInCapLevels = new Set(
    contributors.filter((p) => p.allIn && !p.folded).map((p) => p.totalContribution),
  );

  const pots: Pot[] = [];
  let prevLevel = 0;
  let running: { amount: number; eligible: Set<string> } | null = null;

  for (const level of levels) {
    const delta = level - prevLevel;
    prevLevel = level;
    if (delta <= 0) continue;

    const payers = contributors.filter((p) => p.totalContribution >= level);
    const eligible = payers.filter((p) => !p.folded);

    if (eligible.length > 0) {
      running ??= { amount: 0, eligible: new Set() };
      running.amount += delta * payers.length;
      for (const p of eligible) running.eligible.add(p.id);
    }

    if (allInCapLevels.has(level) && running) {
      pots.push({
        id: newId(),
        isMain: pots.length === 0,
        amount: running.amount,
        eligiblePlayerIds: [...running.eligible],
      });
      running = null;
    }
  }

  if (running) {
    pots.push({
      id: newId(),
      isMain: pots.length === 0,
      amount: running.amount,
      eligiblePlayerIds: [...running.eligible],
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
