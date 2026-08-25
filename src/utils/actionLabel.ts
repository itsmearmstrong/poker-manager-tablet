import type { ActionRecord, GameSettings } from '../types/poker';
import { formatChips } from './format';

export function describeAction(action: ActionRecord, settings: GameSettings): string {
  const amt = action.amount !== undefined ? formatChips(action.amount, settings) : '';
  switch (action.type) {
    case 'post_small_blind':
      return `${action.playerName} posted small blind ${amt}`;
    case 'post_big_blind':
      return `${action.playerName} posted big blind ${amt}`;
    case 'post_ante':
      return `${action.playerName} posted ante ${amt}`;
    case 'check':
      return `${action.playerName} checked`;
    case 'bet':
      return `${action.playerName} bet ${amt}`;
    case 'call':
      return `${action.playerName} called ${amt}`;
    case 'raise':
      return `${action.playerName} raised to ${amt}`;
    case 'fold':
      return `${action.playerName} folded`;
    case 'all_in':
      return `${action.playerName} went all-in ${amt}`;
    default:
      return `${action.playerName} ${action.type}`;
  }
}
