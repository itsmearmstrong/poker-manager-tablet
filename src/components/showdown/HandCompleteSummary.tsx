import type { GameState } from '../../types/poker';
import { useGameStore } from '../../store/gameStore';
import { formatChips } from '../../utils/format';

interface HandCompleteSummaryProps {
  game: GameState;
}

export default function HandCompleteSummary({ game }: HandCompleteSummaryProps) {
  const startNextHand = useGameStore((s) => s.startNextHand);
  const hand = game.handHistory[game.handHistory.length - 1];
  if (!hand) return null;

  const eliminated = game.players.filter((p) => p.status === 'out');

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-4 text-center animate-pot-award">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-500">Hand #{hand.handNumber} Complete</p>
      <h2 className="mt-1 text-2xl font-bold text-white">
        {formatChips(hand.potTotal, game.settings)} awarded
      </h2>

      <div className="mt-4 space-y-2">
        {hand.pots.map((pot, i) => (
          <div key={pot.id} className="rounded-lg border border-ink-700 bg-ink-900 px-4 py-2 text-sm">
            <span className="text-ink-500">{i === 0 ? 'Main Pot' : `Side Pot ${i}`}: </span>
            {pot.winnerIds?.map((id) => {
              const player = game.players.find((p) => p.id === id);
              return (
                <span key={id} className="font-semibold text-gold-400">
                  {player?.name} (+{formatChips(pot.amountWon?.[id] ?? 0, game.settings)}){' '}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {eliminated.length > 0 && (
        <p className="mt-3 text-sm text-red-400">
          Eliminated: {eliminated.map((p) => p.name).join(', ')}
        </p>
      )}

      <button
        onClick={startNextHand}
        className="mt-6 w-full rounded-xl bg-gold-500 py-3 text-base font-bold text-ink-950 shadow-lg hover:bg-gold-400"
      >
        START NEXT HAND
      </button>
    </div>
  );
}
