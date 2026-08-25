import { useState } from 'react';
import type { ActionType, GameState } from '../../types/poker';
import { getLegalActions } from '../../gameEngine/validation';
import { amountToCall } from '../../gameEngine/potManager';
import { useGameStore } from '../../store/gameStore';
import { formatChips } from '../../utils/format';
import BetControl from './BetControl';

interface ActionBarProps {
  game: GameState;
}

const ACTION_ORDER: ActionType[] = ['check', 'call', 'bet', 'raise', 'fold', 'all_in'];

const ACTION_STYLE: Record<ActionType, string> = {
  check: 'bg-ink-700 hover:bg-ink-600 text-white',
  call: 'bg-felt-700 hover:bg-felt-600 text-white',
  bet: 'bg-gold-500 hover:bg-gold-400 text-ink-950',
  raise: 'bg-gold-500 hover:bg-gold-400 text-ink-950',
  fold: 'bg-red-800 hover:bg-red-700 text-white',
  all_in: 'bg-red-600 hover:bg-red-500 text-white',
  post_ante: '',
  post_small_blind: '',
  post_big_blind: '',
};

export default function ActionBar({ game }: ActionBarProps) {
  const playerAction = useGameStore((s) => s.playerAction);
  const [betMode, setBetMode] = useState<'bet' | 'raise' | null>(null);

  const player = game.players.find((p) => p.seat === game.currentPlayerSeat);
  if (!player) return null;

  const legal = getLegalActions(game, player);
  if (legal.length === 0) return null;

  function label(type: ActionType): string {
    switch (type) {
      case 'call':
        return `CALL ${formatChips(amountToCall(game.currentBetAmount, player!), game.settings)}`;
      case 'all_in':
        return `ALL-IN ${formatChips(player!.chips, game.settings)}`;
      default:
        return type.replace('_', '-').toUpperCase();
    }
  }

  function handleClick(type: ActionType) {
    if (type === 'bet' || type === 'raise') {
      setBetMode(type);
      return;
    }
    playerAction(player!.id, type);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-3 sm:gap-3">
        {ACTION_ORDER.filter((t) => legal.includes(t)).map((type) => (
          <button
            key={type}
            onClick={() => handleClick(type)}
            className={`min-w-[92px] rounded-xl px-4 py-3 text-sm font-bold tracking-wide shadow-md transition active:scale-95 ${ACTION_STYLE[type]}`}
          >
            {label(type)}
          </button>
        ))}
      </div>

      {betMode && (
        <BetControl
          game={game}
          player={player}
          mode={betMode}
          onCancel={() => setBetMode(null)}
          onConfirm={(amount) => {
            playerAction(player.id, betMode, amount);
            setBetMode(null);
          }}
        />
      )}
    </>
  );
}
