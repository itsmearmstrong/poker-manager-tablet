import type { GameSettings, GameState, Player } from '../types/poker';
import { MAX_PLAYERS_DEFAULT } from '../types/poker';
import { newId } from '../utils/id';

export function createDefaultSettings(): GameSettings {
  return {
    gameName: 'Poker Night',
    ranked: true,
    maxPlayers: MAX_PLAYERS_DEFAULT,
    startingStack: 1000,
    smallBlind: 10,
    bigBlind: 20,
    ante: 0,
    chipValue: 1,
    currencySymbol: '₹',
  };
}

export function createPlayer(name: string, seat: number, startingChips: number): Player {
  return {
    id: newId(),
    name,
    seat,
    chips: startingChips,
    initialBuyIn: startingChips,
    totalRebuys: 0,
    totalRebuyAmount: 0,
    currentBet: 0,
    totalContribution: 0,
    status: 'active',
    folded: false,
    allIn: false,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    hasActed: false,
    inHand: false,
    sittingOut: false,
  };
}

export function createInitialGameState(settings: GameSettings): GameState {
  const now = Date.now();
  return {
    gameId: newId(),
    gameName: settings.gameName,
    status: 'setup',
    handNumber: 0,
    currentRound: 'preflop',
    dealerSeat: null,
    smallBlindSeat: null,
    bigBlindSeat: null,
    currentPlayerSeat: null,
    lastAggressorSeat: null,
    blinds: { small: settings.smallBlind, big: settings.bigBlind, ante: settings.ante },
    players: [],
    pots: [],
    currentBetAmount: 0,
    minRaiseAmount: settings.bigBlind,
    actionHistory: [],
    handHistory: [],
    settings,
    createdAt: now,
    updatedAt: now,
  };
}
