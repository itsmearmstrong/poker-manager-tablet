import { Fragment, useState } from 'react';
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
  const callAllPreflop = useGameStore((state) => state.callAllPreflop);
  const undo = useGameStore((state) => state.undo);
  const canUndo = useGameStore((state) => state.canUndo());
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
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="min-w-[76px] rounded-xl border border-ink-600 px-3 py-3 text-sm font-bold tracking-wide text-ink-300 transition hover:border-gold-600/60 hover:bg-ink-800 hover:text-gold-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↩ UNDO
        </button>
        {ACTION_ORDER.filter((t) => legal.includes(t)).map((type) => (
          <Fragment key={type}>
            <button
              onClick={() => handleClick(type)}
              className={`min-w-[92px] rounded-xl px-4 py-3 text-sm font-bold tracking-wide shadow-md transition active:scale-95 ${ACTION_STYLE[type]}`}
            >
              {label(type)}
            </button>
            {type === 'call' && game.currentRound === 'preflop' && (
              <button
                type="button"
                onClick={callAllPreflop}
                className="min-w-[104px] rounded-xl bg-felt-600 px-4 py-3 text-sm font-bold tracking-wide text-white shadow-md transition active:scale-95"
              >
                CALL ALL
              </button>
            )}
          </Fragment>
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
