import type { GameState } from '../types/poker';
import type { CompletedHand } from '../types/stats';

export function beginHandAccounting(state: GameState) {
  state.handAccounting = {
    version: 1, startedAt: Date.now(), chipValue: state.settings.chipValue,
    currency: state.settings.currencySymbol,
    players: state.players.filter(p => p.inHand).map(p => ({ playerId: p.id, startingChips: p.chips })),
    changes: [],
  };
}

export function completedResult(state: GameState, completedAt: number): CompletedHand | undefined {
  if (state.settings.ranked === false) return undefined;
  const accounting = state.handAccounting;
  if (!accounting) return undefined; // Legacy balances/adjustments cannot be reconstructed reliably.
  const players = accounting.players.map(start => {
    const player = state.players.find(p => p.id === start.playerId);
    if (!player) throw new Error('A dealt player is missing from hand accounting.');
    const changes = accounting.changes.filter(change => change.playerId === player.id);
    const additions = changes.reduce((sum, change) => sum + Math.max(0, change.delta), 0);
    const withdrawals = changes.reduce((sum, change) => sum + Math.max(0, -change.delta), 0);
    return { ...start, profileId: player.profileId, name: player.name, endingChips: player.chips,
      additions, withdrawals, profit: player.chips - start.startingChips - additions + withdrawals };
  });
  if (Math.abs(players.reduce((sum, p) => sum + p.profit, 0)) > 0.000001) {
    throw new Error('Hand balances do not reconcile. Review pot awards before completing this hand.');
  }
  return { version: 1, id: `${state.gameId}:${state.handNumber}`, gameId: state.gameId,
    handNumber: state.handNumber, gameName: state.gameName, completedAt,
    chipValue: accounting.chipValue, currency: accounting.currency,
    players, changes: structuredClone(accounting.changes), pots: structuredClone(state.pots) };
}
