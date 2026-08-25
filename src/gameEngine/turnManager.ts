import type { GameState, Player } from '../types/poker';

/** All occupied seat numbers, ascending. */
export function occupiedSeats(players: Player[]): number[] {
  return players.map((p) => p.seat).sort((a, b) => a - b);
}

/** The next occupied seat clockwise (ascending, wrapping) after `fromSeat`. */
export function nextOccupiedSeat(players: Player[], fromSeat: number): number | null {
  const seats = occupiedSeats(players);
  if (seats.length === 0) return null;
  const idx = seats.indexOf(fromSeat);
  if (idx === -1) {
    // fromSeat may be empty (e.g. removed player); find the next greater seat, wrapping.
    const next = seats.find((s) => s > fromSeat);
    return next ?? seats[0];
  }
  return seats[(idx + 1) % seats.length];
}

/** Players still dealt into the current hand who have not folded and are not eliminated. */
export function getContestants(state: GameState): Player[] {
  return state.players.filter((p) => p.inHand && !p.folded && p.status === 'active');
}

/** Contestants who can still voluntarily act (not all-in). */
export function getActablePlayers(state: GameState): Player[] {
  return getContestants(state).filter((p) => !p.allIn);
}

/**
 * Finds the next player who still needs to act this round, starting the search
 * just after `fromSeat` and wrapping around the table. Skips folded/all-in/out/empty seats.
 */
export function getNextActableSeat(state: GameState, fromSeat: number): number | null {
  const actable = getActablePlayers(state);
  if (actable.length === 0) return null;
  const actableSeats = new Set(actable.map((p) => p.seat));
  const seats = occupiedSeats(state.players);
  if (seats.length === 0) return null;

  let idx = seats.indexOf(fromSeat);
  if (idx === -1) idx = 0;

  for (let i = 1; i <= seats.length; i++) {
    const seat = seats[(idx + i) % seats.length];
    if (actableSeats.has(seat)) return seat;
  }
  return null;
}

/**
 * The betting round is complete when every non-folded, non-eliminated, non-all-in
 * contestant has acted and matched the current bet. All-in players are exempt from
 * the "matched" requirement since they cannot contribute further.
 */
export function isBettingRoundComplete(state: GameState): boolean {
  const contestants = getContestants(state);
  if (contestants.length <= 1) return true;

  const stillOwed = contestants.some(
    (p) => !p.allIn && (!p.hasActed || p.currentBet !== state.currentBetAmount),
  );
  return !stillOwed;
}

/** True when at most one contestant can still voluntarily act — no more betting is possible. */
export function isBettingLocked(state: GameState): boolean {
  const contestants = getContestants(state);
  if (contestants.length <= 1) return true;
  const canAct = contestants.filter((p) => !p.allIn);
  return canAct.length <= 1 && contestants.every((p) => p.allIn || p.currentBet === state.currentBetAmount);
}
