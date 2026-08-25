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
  const [amount, setAmount] = useState(bounds.min);
  const { settings } = game;
  const pot = livePotTotal(game.players);

  const step = Math.max(1, settings.bigBlind);
  const clamp = (v: number) => Math.min(bounds.max, Math.max(bounds.min, Math.round(v)));

  const quickOptions: { label: string; to: number }[] = [
    { label: 'MIN', to: bounds.min },
    { label: '½ POT', to: game.currentBetAmount + pot * 0.5 },
    { label: '¾ POT', to: game.currentBetAmount + pot * 0.75 },
    { label: 'POT', to: game.currentBetAmount + pot },
    { label: '2× POT', to: game.currentBetAmount + pot * 2 },
    { label: 'ALL-IN', to: bounds.max },
  ];

  return (
    <Modal title={mode === 'bet' ? 'Place Bet' : 'Raise'} onClose={onCancel} width="max-w-sm">
      <div className="mb-4 space-y-1 rounded-lg bg-ink-900 p-3 text-sm text-ink-500">
        <Row label="Current Pot" value={formatChips(pot, settings)} />
        <Row label="Current Bet" value={formatChips(game.currentBetAmount, settings)} />
        <Row label="Your Stack" value={formatChips(player.chips + player.currentBet, settings)} />
      </div>

      <p className="mb-1 text-center text-xs uppercase tracking-wide text-ink-500">Amount (total this round)</p>
      <div className="mb-3 flex items-center justify-center gap-3">
        <RoundButton onClick={() => setAmount(clamp(amount - step))}>-</RoundButton>
        <span className="min-w-[110px] text-center text-2xl font-bold text-gold-400">
          {formatChips(amount, settings)}
        </span>
        <RoundButton onClick={() => setAmount(clamp(amount + step))}>+</RoundButton>
      </div>

      <input
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={1}
        value={amount}
        onChange={(e) => setAmount(clamp(Number(e.target.value)))}
        className="mb-4 w-full accent-yellow-500"
      />

      <div className="mb-4 grid grid-cols-3 gap-2">
        {quickOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setAmount(clamp(opt.to))}
            className="rounded-lg border border-ink-600 bg-ink-900 py-1.5 text-xs font-medium text-white hover:border-gold-500 hover:text-gold-400"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs text-ink-500">Or enter exact amount</label>
        <input
          type="number"
          value={amount}
          min={bounds.min}
          max={bounds.max}
          onChange={(e) => setAmount(clamp(Number(e.target.value)))}
          className="w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-white outline-none focus:border-gold-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-ink-600 py-2.5 text-sm text-white hover:bg-ink-700"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(amount)}
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
      className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-600 text-lg font-bold text-white hover:border-gold-500 hover:text-gold-400"
    >
      {children}
    </button>
  );
}
