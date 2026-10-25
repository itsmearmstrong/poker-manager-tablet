import type { GameState } from '../types/poker';
import { createPlayer } from './gameFactory';

export function addPlayer(state: GameState, name: string, seat: number, startingChips: number): GameState {
  if (!Number.isInteger(seat) || seat < 1 || seat > 12 || state.players.filter(p => !p.removed).length >= 12) {
    throw new Error('The table supports up to 12 players.');
  }
  const next = structuredClone(state);
  if (next.players.some((p) => !p.removed && p.seat === seat)) {
    throw new Error(`Seat ${seat} is already occupied`);
  }
  next.settings.maxPlayers = Math.max(next.settings.maxPlayers, seat);
  next.players.push(createPlayer(name, seat, startingChips));
  next.updatedAt = Date.now();
  return next;
}

export function renamePlayer(state: GameState, playerId: string, name: string): GameState {
  const next = structuredClone(state);
  const player = next.players.find((candidate) => candidate.id === playerId);
  const trimmedName = name.trim();
  if (!player || !trimmedName) return state;

  player.name = trimmedName;

  next.updatedAt = Date.now();
  return next;
}

export function removePlayer(state: GameState, playerId: string): GameState {
  const next = structuredClone(state);
  const player = next.players.find((p) => p.id === playerId);
  if (!player) return next;

  if (next.status === 'setup') {
    next.players = next.players.filter((p) => p.id !== playerId);
  } else {
    // Mid-game: vacate them from future hands; if they're live in the current hand,
    // treat it as a fold so pot accounting for chips already contributed stays correct.
    player.status = 'out';
    player.removed = true;
    player.sittingOut = true;
    if (player.inHand) player.folded = true;
    const withdrawn = player.chips;
    if (withdrawn > 0 && next.handAccounting && (next.status === 'in_progress' || next.status === 'paused')) {
      next.handAccounting.changes.push({ playerId, kind: 'correction', delta: -withdrawn, timestamp: Date.now() });
    }
    player.chips = 0;
  }
  next.updatedAt = Date.now();
  return next;
}

export function movePlayerSeat(state: GameState, playerId: string, direction: 'up' | 'down'): GameState {
  // Seat numbers drive dealer/blind/turn resolution during a hand — only safe to
  // reorder in setup or between hands, never while 'in_progress'/'paused'.
  if (state.status !== 'setup' && state.status !== 'hand_complete') return state;
  const sorted = [...state.players].sort((a, b) => a.seat - b.seat);
  const index = sorted.findIndex((p) => p.id === playerId);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= sorted.length) return state;

  const next = structuredClone(state);
  const player = next.players.find((p) => p.id === playerId)!;
  const neighbor = next.players.find((p) => p.id === sorted[targetIndex].id)!;
  [player.seat, neighbor.seat] = [neighbor.seat, player.seat];
  next.updatedAt = Date.now();
  return next;
}

export function swapPlayerSeats(state: GameState, playerIdA: string, playerIdB: string): GameState {
  // Same restriction as movePlayerSeat: seat numbers drive dealer/blind/turn
  // resolution during a hand, so only safe in setup or between hands.
  if (state.status !== 'setup' && state.status !== 'hand_complete') return state;
  if (playerIdA === playerIdB) return state;

  const next = structuredClone(state);
  const a = next.players.find((p) => p.id === playerIdA);
  const b = next.players.find((p) => p.id === playerIdB);
  if (!a || !b) return state;

  [a.seat, b.seat] = [b.seat, a.seat];
  next.updatedAt = Date.now();
  return next;
}

export function adjustPlayerChips(state: GameState, playerId: string, delta: number): GameState {
  if (!Number.isFinite(delta)) throw new Error('Enter a finite chip adjustment.');
  const next = structuredClone(state);
  const player = next.players.find((p) => p.id === playerId);
  if (!player) return next;
  const applied = Math.max(0, player.chips + delta) - player.chips;
  player.chips += applied;
  if (next.handAccounting && (next.status === 'in_progress' || next.status === 'paused')) {
    next.handAccounting.changes.push({ playerId, kind: 'correction', delta: applied, timestamp: Date.now() });
  }
  if (player.chips > 0 && player.status === 'out') player.status = 'active';
  next.updatedAt = Date.now();
  return next;
}

export function addRebuy(state: GameState, playerId: string, amount: number): GameState {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a positive rebuy amount.');
  const next = structuredClone(state);
  const player = next.players.find((p) => p.id === playerId);
  if (!player) return next;
  player.chips += amount;
  if (next.handAccounting && (next.status === 'in_progress' || next.status === 'paused')) {
    next.handAccounting.changes.push({ playerId, kind: 'rebuy', delta: amount, timestamp: Date.now() });
  }
  player.totalRebuys += 1;
  player.totalRebuyAmount += amount;
  if (player.status === 'out') player.status = 'active';
  // A rebuy between hands means the player is returning for the very next deal.
  // Removal/elimination previously left this flag set, which incorrectly skipped
  // the player for one additional hand.
  player.sittingOut = false;
  player.removed = false;
  next.updatedAt = Date.now();
  return next;
}

export function toggleSitOut(state: GameState, playerId: string): GameState {
  const next = structuredClone(state);
  const player = next.players.find((p) => p.id === playerId);
  if (!player) return next;
  player.sittingOut = !player.sittingOut;
  next.updatedAt = Date.now();
  return next;
}

export function changeBlinds(state: GameState, small: number, big: number, ante: number): GameState {
  const next = structuredClone(state);
  next.blinds = { small, big, ante };
  next.settings = { ...next.settings, smallBlind: small, bigBlind: big, ante };
  next.updatedAt = Date.now();
  return next;
}

export function setPaused(state: GameState, paused: boolean): GameState {
  const next = structuredClone(state);
  if (paused && next.status === 'in_progress') next.status = 'paused';
  else if (!paused && next.status === 'paused') next.status = 'in_progress';
  next.updatedAt = Date.now();
  return next;
}

export function endGame(state: GameState): GameState {
  const next = structuredClone(state);
  next.status = 'ended';
  next.updatedAt = Date.now();
  return next;
}
