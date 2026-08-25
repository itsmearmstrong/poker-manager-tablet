import type { ActionRecord, ActionType, GameState, HandHistoryEntry, Round } from '../types/poker';
import { ROUND_ORDER } from '../types/poker';
import { newId } from '../utils/id';
import { assignInitialPositions, firstToActPostflop, rotatePositions } from './dealerManager';
import { buildPots, totalPotAmount } from './potManager';
import { getContestants } from './turnManager';

function pushSystemAction(state: GameState, playerId: string, type: ActionType, amount: number) {
  const player = state.players.find((p) => p.id === playerId)!;
  const record: ActionRecord = {
    id: newId(),
    handNumber: state.handNumber,
    round: state.currentRound,
    playerId: player.id,
    playerName: player.name,
    seat: player.seat,
    type,
    amount,
    potAfter: state.players.reduce((s, p) => s + p.totalContribution, 0),
    timestamp: Date.now(),
  };
  state.actionHistory.push(record);
}

function postForcedBet(player: { chips: number; currentBet: number; totalContribution: number; allIn: boolean }, amount: number) {
  const paid = Math.min(amount, player.chips);
  player.chips -= paid;
  player.currentBet += paid;
  player.totalContribution += paid;
  if (player.chips === 0) player.allIn = true;
  return paid;
}

/** True once every eligible player has had a turn as dealer, i.e. this is hand #1. */
export function isFirstHand(state: GameState): boolean {
  return state.handNumber === 0 || state.dealerSeat === null;
}

/** Deals a new hand: rotates positions, resets per-hand player state, posts blinds/antes. */
export function startNewHand(state: GameState): GameState {
  const next = structuredClone(state);

  const positions = isFirstHand(next)
    ? assignInitialPositions(next.players)
    : rotatePositions(next.players, next.dealerSeat!);

  next.handNumber += 1;
  next.currentRound = 'preflop';
  next.dealerSeat = positions.dealerSeat;
  next.smallBlindSeat = positions.smallBlindSeat;
  next.bigBlindSeat = positions.bigBlindSeat;
  next.actionHistory = [];
  next.pots = [];
  next.currentBetAmount = 0;
  next.minRaiseAmount = next.blinds.big;
  next.lastAggressorSeat = null;

  for (const p of next.players) {
    p.folded = false;
    p.allIn = false;
    p.currentBet = 0;
    p.totalContribution = 0;
    p.hasActed = false;
    p.isDealer = p.seat === positions.dealerSeat;
    p.isSmallBlind = p.seat === positions.smallBlindSeat;
    p.isBigBlind = p.seat === positions.bigBlindSeat;
    p.inHand = p.status === 'active' && p.chips > 0 && !p.sittingOut;
  }

  if (next.blinds.ante > 0) {
    for (const p of next.players) {
      if (!p.inHand) continue;
      const paid = postForcedBet(p, next.blinds.ante);
      // Antes go straight to the pot and don't count toward the amount owed this round.
      p.currentBet -= paid;
      pushSystemAction(next, p.id, 'post_ante', paid);
    }
  }

  const sb = next.players.find((p) => p.seat === positions.smallBlindSeat && p.inHand);
  if (sb) {
    const paid = postForcedBet(sb, next.blinds.small);
    pushSystemAction(next, sb.id, 'post_small_blind', paid);
  }

  const bb = next.players.find((p) => p.seat === positions.bigBlindSeat && p.inHand);
  if (bb) {
    const paid = postForcedBet(bb, next.blinds.big);
    pushSystemAction(next, bb.id, 'post_big_blind', paid);
  }

  next.currentBetAmount = bb ? bb.currentBet : next.blinds.big;
  next.currentPlayerSeat = positions.firstToActSeat;
  next.status = 'in_progress';

  // Reset the one-hand "skip" flag now that it has taken effect.
  for (const p of next.players) p.sittingOut = false;

  next.pots = buildPots(next.players);
  next.updatedAt = Date.now();
  return next;
}

/** Re-deals the current hand from scratch with the same dealer/blinds — all bets are undone. */
export function restartHand(state: GameState): GameState {
  const next = structuredClone(state);
  const dealerSeat = next.dealerSeat!;
  const smallBlindSeat = next.smallBlindSeat!;
  const bigBlindSeat = next.bigBlindSeat!;

  next.currentRound = 'preflop';
  next.actionHistory = [];
  next.pots = [];
  next.currentBetAmount = 0;
  next.minRaiseAmount = next.blinds.big;
  next.lastAggressorSeat = null;

  for (const p of next.players) {
    p.folded = false;
    p.allIn = false;
    p.currentBet = 0;
    p.totalContribution = 0;
    p.hasActed = false;
    p.inHand = p.status === 'active' && p.chips > 0 && !p.sittingOut;
  }

  if (next.blinds.ante > 0) {
    for (const p of next.players) {
      if (!p.inHand) continue;
      const paid = postForcedBet(p, next.blinds.ante);
      p.currentBet -= paid;
      pushSystemAction(next, p.id, 'post_ante', paid);
    }
  }

  const sb = next.players.find((p) => p.seat === smallBlindSeat && p.inHand);
  if (sb) pushSystemAction(next, sb.id, 'post_small_blind', postForcedBet(sb, next.blinds.small));

  const bb = next.players.find((p) => p.seat === bigBlindSeat && p.inHand);
  if (bb) pushSystemAction(next, bb.id, 'post_big_blind', postForcedBet(bb, next.blinds.big));

  const firstToAct =
    next.players.filter((p) => p.status === 'active').length === 2
      ? dealerSeat
      : firstToActPostflop(next.players, bigBlindSeat);

  next.currentBetAmount = bb ? bb.currentBet : next.blinds.big;
  next.currentPlayerSeat = firstToAct;
  next.status = 'in_progress';
  next.pots = buildPots(next.players);
  next.updatedAt = Date.now();
  return next;
}

/** Advances to the next street, resetting per-round betting state. */
export function advanceRound(state: GameState): GameState {
  const next = structuredClone(state);
  const idx = ROUND_ORDER.indexOf(next.currentRound);
  if (idx >= ROUND_ORDER.length - 1) return next;

  next.currentRound = ROUND_ORDER[idx + 1] as Round;
  for (const p of next.players) {
    p.currentBet = 0;
    p.hasActed = false;
  }
  next.currentBetAmount = 0;
  next.minRaiseAmount = next.blinds.big;
  next.lastAggressorSeat = null;

  if (next.currentRound === 'showdown') {
    next.currentPlayerSeat = null;
    next.pots = buildPots(next.players);
  } else {
    next.currentPlayerSeat = firstToActPostflop(next.players, next.dealerSeat!);
  }

  next.updatedAt = Date.now();
  return next;
}

export type HandOutcome = 'continue' | 'uncontested' | 'awaiting_showdown';

/** What should happen next given the current state: keep playing, auto-award, or show the winner picker. */
export function getHandOutcome(state: GameState): HandOutcome {
  const contestants = getContestants(state);
  if (contestants.length <= 1) return 'uncontested';
  if (state.currentRound === 'showdown') return 'awaiting_showdown';
  return 'continue';
}

/** Awards each pot to its chosen winner(s), splitting evenly with remainder to the earliest winner. */
export function awardPots(state: GameState, winnersByPotId: Record<string, string[]>): GameState {
  const next = structuredClone(state);
  for (const pot of next.pots) {
    const winnerIds = winnersByPotId[pot.id];
    if (!winnerIds || winnerIds.length === 0) continue;

    const share = Math.floor(pot.amount / winnerIds.length);
    const remainder = pot.amount - share * winnerIds.length;
    const amountWon: Record<string, number> = {};

    winnerIds.forEach((id, i) => {
      const amt = share + (i < remainder ? 1 : 0);
      amountWon[id] = amt;
      const player = next.players.find((p) => p.id === id);
      if (player) player.chips += amt;
    });

    pot.winnerIds = winnerIds;
    pot.amountWon = amountWon;
  }
  next.updatedAt = Date.now();
  return next;
}

/** Shortcut for an uncontested win (everyone else folded): awards every live pot to the lone contestant. */
export function awardUncontestedPot(state: GameState, winnerId: string): GameState {
  const pots = state.pots.length > 0 ? state.pots : buildPots(state.players);
  const winnersByPotId: Record<string, string[]> = {};
  for (const pot of pots) {
    if (pot.eligiblePlayerIds.includes(winnerId)) winnersByPotId[pot.id] = [winnerId];
  }
  return awardPots({ ...state, pots }, winnersByPotId);
}

/** Records the completed hand to history, marks eliminated players, and closes out the hand. */
export function finalizeHand(state: GameState): GameState {
  const next = structuredClone(state);

  const entry: HandHistoryEntry = {
    handNumber: next.handNumber,
    dealerSeat: next.dealerSeat!,
    smallBlindSeat: next.smallBlindSeat!,
    bigBlindSeat: next.bigBlindSeat!,
    startedAt: next.actionHistory[0]?.timestamp ?? next.updatedAt,
    endedAt: Date.now(),
    potTotal: totalPotAmount(next.pots),
    pots: next.pots,
    actions: next.actionHistory,
    playerSnapshots: next.players
      .filter((p) => p.inHand)
      .map((p) => {
        const amountWon = next.pots.reduce((sum, pot) => sum + (pot.amountWon?.[p.id] ?? 0), 0);
        return {
          playerId: p.id,
          name: p.name,
          seat: p.seat,
          startingChips: p.chips + p.totalContribution - amountWon,
          endingChips: p.chips,
        };
      }),
  };
  next.handHistory.push(entry);

  for (const p of next.players) {
    if (p.status === 'active' && p.chips === 0) p.status = 'out';
  }

  next.status = 'hand_complete';
  next.updatedAt = Date.now();
  return next;
}
