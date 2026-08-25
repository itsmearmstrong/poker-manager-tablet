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
  const idx = ROUND_ORDER.indexOf(game.currentRound);
  const nextRound = ROUND_ORDER[idx + 1];
  if (!nextRound) return null;

  return (
    <div className="flex justify-center py-4">
      <button
        onClick={advanceToNextRound}
        className="rounded-xl bg-felt-700 px-8 py-3 text-base font-bold text-white shadow-lg hover:bg-felt-600 active:scale-95"
      >
        {NEXT_LABEL[nextRound]}
      </button>
    </div>
  );
}
