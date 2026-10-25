import { useState } from 'react';
import type { GameState, Player } from '../../types/poker';
import { getBetBounds } from '../../gameEngine/validation';
import { livePotTotal } from '../../gameEngine/potManager';
import { formatChips } from '../../utils/format';
import Modal from '../common/Modal';

interface BetControlProps {
  game: GameState;
  player: Player;
  mode: 'bet' | 'raise';
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

export default function BetControl({ game, player, mode, onConfirm, onCancel }: BetControlProps) {
  const bounds = getBetBounds(game, player);
  // The engine validates raises as the total bet for the round. At the table,
  // displaying the additional raise is clearer (e.g. raise by 20, to 40).
  const amountOffset = mode === 'raise' ? game.currentBetAmount : 0;
  const displayMin = bounds.min - amountOffset;
  const displayMax = bounds.max - amountOffset;
  const [amountText, setAmountText] = useState(String(displayMin));
  const { settings } = game;
  const pot = livePotTotal(game.players);

  const step = Math.max(1, settings.bigBlind);
  const clamp = (v: number) => Math.min(displayMax, Math.max(displayMin, Math.round(v)));
  const amount = clamp(Number(amountText) || displayMin);
  const setAmount = (value: number) => setAmountText(String(clamp(value)));

  const quickOptions: { label: string; amount: number }[] = [
    { label: 'MIN', amount: displayMin },
    { label: '½ POT', amount: game.currentBetAmount + pot * 0.5 - amountOffset },
    { label: '¾ POT', amount: game.currentBetAmount + pot * 0.75 - amountOffset },
    { label: 'POT', amount: game.currentBetAmount + pot - amountOffset },
    { label: '2× POT', amount: game.currentBetAmount + pot * 2 - amountOffset },
    { label: 'ALL-IN', amount: displayMax },
  ];

  return (
    <Modal title={mode === 'bet' ? 'Place Bet' : 'Raise'} onClose={onCancel} width="max-w-sm">
      <div className="mb-4 space-y-1 rounded-lg bg-ink-900 p-3 text-sm text-ink-500">
        <Row label="Current Pot" value={formatChips(pot, settings)} />
        <Row label="Current Bet" value={formatChips(game.currentBetAmount, settings)} />
        <Row label="Your Stack" value={formatChips(player.chips + player.currentBet, settings)} />
      </div>

      <p className="mb-1 text-center text-xs uppercase tracking-wide text-ink-500">
        {mode === 'raise' ? 'Raise by' : 'Bet amount'}
      </p>
      <div className="mb-3 flex items-center justify-center gap-3">
        <RoundButton onClick={() => setAmount(clamp(amount - step))}>-</RoundButton>
        <div className="relative min-w-[150px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold text-gold-400">
            {settings.currencySymbol}
          </span>
          <input
            type="number"
            inputMode="numeric"
            aria-label={mode === 'raise' ? 'Raise by amount' : 'Bet amount'}
            value={amountText}
            min={displayMin}
            max={displayMax}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setAmountText(event.target.value)}
            onBlur={() => setAmount(amount)}
            className="h-12 w-full appearance-none rounded-lg border border-gold-600/60 bg-ink-900 px-8 text-center text-2xl font-bold text-gold-400 outline-none focus:border-gold-400"
          />
        </div>
        <RoundButton onClick={() => setAmount(clamp(amount + step))}>+</RoundButton>
      </div>

      {mode === 'raise' && (
        <p className="mb-3 text-center text-sm text-ink-500">
          Total bet: <span className="font-semibold text-white">{formatChips(amount + amountOffset, settings)}</span>
        </p>
      )}

      <input
        type="range"
        min={displayMin}
        max={displayMax}
        step={1}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="mb-4 w-full accent-yellow-500"
      />

      <div className="mb-4 grid grid-cols-3 gap-2">
        {quickOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setAmount(opt.amount)}
            className="rounded-lg border border-ink-600 bg-ink-900 py-1.5 text-xs font-medium text-white hover:border-gold-500 hover:text-gold-400"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-ink-600 py-2.5 text-sm text-white hover:bg-ink-700"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(amount + amountOffset)}
          className="flex-1 rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-ink-950 hover:bg-gold-400"
        >
          CONFIRM {mode === 'bet' ? 'BET' : 'RAISE'}
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function RoundButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-600 text-lg font-bold text-white hover:border-gold-500 hover:text-gold-400"
    >
      {children}
    </button>
  );
}
