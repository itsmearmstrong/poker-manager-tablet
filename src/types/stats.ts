export interface Profile { id: string; name: string; createdAt: number }
export interface ExternalChange { playerId: string; kind: 'rebuy' | 'correction'; delta: number; timestamp: number }
export interface HandAccounting {
  version: 1;
  startedAt: number;
  chipValue: number;
  currency: string;
  players: { playerId: string; startingChips: number }[];
  changes: ExternalChange[];
}
export interface HandResult {
  playerId: string;
  profileId?: string;
  name: string;
  startingChips: number;
  endingChips: number;
  additions: number;
  withdrawals: number;
  profit: number;
}
export interface CompletedHand {
  version: 1;
  id: string;
  gameId: string;
  handNumber: number;
  gameName: string;
  completedAt: number;
  chipValue: number;
  currency: string;
  players: HandResult[];
  changes: ExternalChange[];
  pots: import('./poker').Pot[];
}
export interface Session { id: string; name: string; status: 'ongoing' | 'completed'; updatedAt: number }
export interface ArchiveOp { id: string; put: CompletedHand[]; remove: string[]; session: Session }
