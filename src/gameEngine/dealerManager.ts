import type { Player } from '../types/poker';
import { nextOccupiedSeat, occupiedSeats } from './turnManager';

export interface TablePositions {
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  firstToActSeat: number;
}

function activePlayers(players: Player[]): Player[] {
  return players.filter((p) => p.status === 'active');
}

/** Assigns dealer/SB/BB for the very first hand of the game: lowest occupied seat deals. */
export function assignInitialPositions(players: Player[]): TablePositions {
  const active = activePlayers(players);
  const seats = occupiedSeats(active);
  const dealerSeat = seats[0];
  return computePositionsFromDealer(active, dealerSeat);
}

/** Rotates the dealer button to the next active seat and recomputes SB/BB/first-to-act. */
export function rotatePositions(players: Player[], previousDealerSeat: number): TablePositions {
  const active = activePlayers(players);
  const dealerSeat = nextOccupiedSeat(active, previousDealerSeat) ?? activePlayers(players)[0]?.seat;
  return computePositionsFromDealer(active, dealerSeat);
}

function computePositionsFromDealer(active: Player[], dealerSeat: number): TablePositions {
  if (active.length === 2) {
    // Heads-up: the dealer is the small blind and acts first pre-flop.
    const otherSeat = nextOccupiedSeat(active, dealerSeat)!;
    return {
      dealerSeat,
      smallBlindSeat: dealerSeat,
      bigBlindSeat: otherSeat,
      firstToActSeat: dealerSeat,
    };
  }

  const smallBlindSeat = nextOccupiedSeat(active, dealerSeat)!;
  const bigBlindSeat = nextOccupiedSeat(active, smallBlindSeat)!;
  const firstToActSeat = nextOccupiedSeat(active, bigBlindSeat)!;

  return { dealerSeat, smallBlindSeat, bigBlindSeat, firstToActSeat };
}

/** First player to act on post-flop streets: first active seat clockwise from the dealer. */
export function firstToActPostflop(players: Player[], dealerSeat: number): number | null {
  const contestants = players.filter((p) => p.inHand && !p.folded && p.status === 'active' && !p.allIn);
  if (contestants.length === 0) return null;
  return nextOccupiedSeat(contestants, dealerSeat) ?? contestants[0].seat;
}
