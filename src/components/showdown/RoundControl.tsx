import type { GameState } from '../../types/poker';
import { ROUND_ORDER } from '../../types/poker';
import { useGameStore } from '../../store/gameStore';

interface RoundControlProps {
  game: GameState;
}

const NEXT_LABEL: Record<string, string> = {
  flop: 'ADVANCE TO FLOP',
  turn: 'ADVANCE TO TURN',
  river: 'ADVANCE TO RIVER',
  showdown: 'GO TO SHOWDOWN',
};

export default function RoundControl({ game }: RoundControlProps) {
  const advanceToNextRound = useGameStore((s) => s.advanceToNextRound);
  const undo = useGameStore((state) => state.undo);
  const canUndo = useGameStore((state) => state.canUndo());
  const idx = ROUND_ORDER.indexOf(game.currentRound);
  const nextRound = ROUND_ORDER[idx + 1];
  if (!nextRound) return null;

  return (
    <div className="flex justify-center gap-2 px-3 py-4">
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        className="min-h-12 rounded-xl border border-ink-600 px-5 py-3 text-sm font-bold text-ink-300 hover:border-gold-600/60 hover:bg-ink-800 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ↩ UNDO
      </button>
      <button
        onClick={advanceToNextRound}
        className="min-h-12 rounded-xl bg-felt-700 px-8 py-3 text-base font-bold text-white shadow-md hover:bg-felt-600 active:scale-95"
      >
        {NEXT_LABEL[nextRound]}
      </button>
    </div>
  );
}
