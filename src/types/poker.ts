// Core domain types for the poker table manager.
// The application never models cards or hands — only chips, betting, and turn order.

export type Round = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export const ROUND_ORDER: Round[] = ['preflop', 'flop', 'turn', 'river', 'showdown'];

export type GameStatus = 'setup' | 'in_progress' | 'paused' | 'hand_complete' | 'ended';

export type PlayerStatus = 'active' | 'out';

export type ActionType =
  | 'post_small_blind'
  | 'post_big_blind'
  | 'post_ante'
  | 'check'
  | 'bet'
  | 'call'
  | 'raise'
  | 'fold'
  | 'all_in';

export interface Player {
  id: string;
  name: string;
  seat: number;
  chips: number;
  initialBuyIn: number;
  totalRebuys: number;
  totalRebuyAmount: number;
  currentBet: number;
  totalContribution: number;
  status: PlayerStatus;
  folded: boolean;
  allIn: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  hasActed: boolean;
  inHand: boolean;
  sittingOut: boolean;
}

export interface Blinds {
  small: number;
  big: number;
  ante: number;
}

export interface GameSettings {
  gameName: string;
  maxPlayers: number;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  chipValue: number;
  currencySymbol: string;
}

export interface Pot {
  id: string;
  isMain: boolean;
  amount: number;
  eligiblePlayerIds: string[];
  winnerIds?: string[];
  amountWon?: Record<string, number>;
}

export interface ActionRecord {
  id: string;
  handNumber: number;
  round: Round;
  playerId: string;
  playerName: string;
  seat: number;
  type: ActionType;
  amount?: number;
  potAfter: number;
  timestamp: number;
}

export interface PlayerHandSnapshot {
  playerId: string;
  name: string;
  seat: number;
  startingChips: number;
  endingChips: number;
}

export interface HandHistoryEntry {
  handNumber: number;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  startedAt: number;
  endedAt: number;
  potTotal: number;
  pots: Pot[];
  actions: ActionRecord[];
  playerSnapshots: PlayerHandSnapshot[];
}

export interface GameState {
  gameId: string;
  gameName: string;
  status: GameStatus;
  handNumber: number;
  currentRound: Round;
  dealerSeat: number | null;
  smallBlindSeat: number | null;
  bigBlindSeat: number | null;
  currentPlayerSeat: number | null;
  lastAggressorSeat: number | null;
  blinds: Blinds;
  players: Player[];
  pots: Pot[];
  currentBetAmount: number;
  minRaiseAmount: number;
  actionHistory: ActionRecord[];
  handHistory: HandHistoryEntry[];
  settings: GameSettings;
  createdAt: number;
  updatedAt: number;
}

export const MAX_PLAYERS_DEFAULT = 10;
export const MIN_PLAYERS_TO_START = 2;
