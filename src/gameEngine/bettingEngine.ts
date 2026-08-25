import type { ActionRecord, ActionType, GameState, Player } from '../types/poker';
import { newId } from '../utils/id';
import { buildPots, livePotTotal, amountToCall } from './potManager';
import { validateActionAmount } from './validation';

function findPlayer(state: GameState, playerId: string): Player {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);
  return player;
}

function contributeChips(player: Player, paid: number) {
  player.chips -= paid;
  player.currentBet += paid;
  player.totalContribution += paid;
  if (player.chips <= 0) {
    player.chips = 0;
    player.allIn = true;
  }
}

/** Resets hasActed for every other contesting player when a bet/raise reopens the action. */
function reopenAction(state: GameState, actorId: string) {
  for (const p of state.players) {
    if (p.id === actorId) continue;
    if (p.inHand && !p.folded && p.status === 'active' && !p.allIn) {
      p.hasActed = false;
    }
  }
}

/**
 * Applies a player action, returning a new GameState. Assumes the caller has
 * already confirmed it's this player's turn; amount validation is enforced here.
 */
export function applyAction(
  state: GameState,
  playerId: string,
  type: ActionType,
  amount?: number,
): GameState {
  const next = structuredClone(state);
  const player = findPlayer(next, playerId);

  const validation = validateActionAmount(next, player, type, amount);
  if (!validation.valid) throw new Error(validation.error);

  let recordedAmount: number | undefined;
  const previousCurrentBetAmount = next.currentBetAmount;

  switch (type) {
    case 'check': {
      player.hasActed = true;
      break;
    }
    case 'fold': {
      player.folded = true;
      player.hasActed = true;
      break;
    }
    case 'call': {
      const toCall = amountToCall(next.currentBetAmount, player);
      const paid = Math.min(toCall, player.chips);
      contributeChips(player, paid);
      player.hasActed = true;
      recordedAmount = paid;
      break;
    }
    case 'bet': {
      const paid = amount! - player.currentBet;
      contributeChips(player, paid);
      next.currentBetAmount = player.currentBet;
      next.minRaiseAmount = Math.max(next.minRaiseAmount, player.currentBet - previousCurrentBetAmount);
      next.lastAggressorSeat = player.seat;
      reopenAction(next, player.id);
      player.hasActed = true;
      recordedAmount = player.currentBet;
      break;
    }
    case 'raise': {
      const paid = amount! - player.currentBet;
      contributeChips(player, paid);
      next.currentBetAmount = player.currentBet;
      next.minRaiseAmount = Math.max(next.minRaiseAmount, player.currentBet - previousCurrentBetAmount);
      next.lastAggressorSeat = player.seat;
      reopenAction(next, player.id);
      player.hasActed = true;
      recordedAmount = player.currentBet;
      break;
    }
    case 'all_in': {
      const paid = player.chips;
      contributeChips(player, paid);
      if (player.currentBet > next.currentBetAmount) {
        next.minRaiseAmount = Math.max(next.minRaiseAmount, player.currentBet - previousCurrentBetAmount);
        next.currentBetAmount = player.currentBet;
        next.lastAggressorSeat = player.seat;
        reopenAction(next, player.id);
      }
      player.hasActed = true;
      recordedAmount = paid;
      break;
    }
    default:
      throw new Error(`Unsupported action type: ${type}`);
  }

  next.pots = buildPots(next.players);

  const record: ActionRecord = {
    id: newId(),
    handNumber: next.handNumber,
    round: next.currentRound,
    playerId: player.id,
    playerName: player.name,
    seat: player.seat,
    type,
    amount: recordedAmount,
    potAfter: livePotTotal(next.players),
    timestamp: Date.now(),
  };
  next.actionHistory.push(record);
  next.updatedAt = Date.now();

  return next;
}
