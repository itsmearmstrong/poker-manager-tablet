import type { GameSettings } from '../types/poker';

export function formatChips(chips: number, settings: Pick<GameSettings, 'chipValue' | 'currencySymbol'>): string {
  const value = chips * settings.chipValue;
  return `${settings.currencySymbol}${value.toLocaleString('en-IN')}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-IN');
}
