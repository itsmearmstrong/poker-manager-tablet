import type { ActionType, GameState, Player } from '../types/poker';
import { amountToCall } from './potManager';

export interface BetBounds {
  min: number;
  max: number;
}

export function canPlayerAct(state: GameState, player: Player): boolean {
  return (
    state.status === 'in_progress' &&
    player.inHand &&
    !player.folded &&
    !player.allIn &&
    player.status === 'active' &&
    state.currentPlayerSeat === player.seat
  );
}

/** Returns the set of legal action types for a player, in display order. */
export function getLegalActions(state: GameState, player: Player): ActionType[] {
  if (!canPlayerAct(state, player)) return [];

  const toCall = amountToCall(state.currentBetAmount, player);
  const actions: ActionType[] = [];

  if (toCall <= 0) {
    actions.push('check');
    if (player.chips > 0) {
      actions.push(state.currentBetAmount === 0 ? 'bet' : 'raise');
    }
    if (state.currentRound !== 'preflop') {
      actions.push('fold');
    }
  } else {
    actions.push('call');
    if (player.chips > toCall) actions.push('raise');
    actions.push('fold');
  }

  if (player.chips > 0) actions.push('all_in');

  return actions;
}

/** Legal "raise to" / "bet to" bounds for a player, in total-this-round terms. */
export function getBetBounds(state: GameState, player: Player): BetBounds {
  const maxTo = player.currentBet + player.chips;
  if (state.currentBetAmount === 0) {
    const min = Math.min(state.blinds.big, maxTo);
    return { min, max: maxTo };
  }
  const minTo = Math.min(state.currentBetAmount + state.minRaiseAmount, maxTo);
  return { min: minTo, max: maxTo };
}

export function validateActionAmount(
  state: GameState,
  player: Player,
  type: ActionType,
  amount?: number,
): { valid: boolean; error?: string } {
  if (!getLegalActions(state, player).includes(type)) {
    return { valid: false, error: `${type} is not a legal action right now` };
  }

  if (type === 'bet' || type === 'raise') {
    const { min, max } = getBetBounds(state, player);
    if (amount === undefined) return { valid: false, error: 'Amount is required' };
    if (amount < min) return { valid: false, error: `Minimum is ${min}` };
    if (amount > max) return { valid: false, error: `Maximum is ${max}` };
  }

  return { valid: true };
}
