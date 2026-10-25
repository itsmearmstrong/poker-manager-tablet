import { useGameStore } from '../../store/gameStore';

export default function ResumePrompt() {
  const savedGame = useGameStore((s) => s.savedGameAvailable);
  const resumeSavedGame = useGameStore((s) => s.resumeSavedGame);
  const discardSavedGame = useGameStore((s) => s.discardSavedGame);

  if (!savedGame) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-xl border border-gold-600/40 bg-ink-900 p-6 text-center shadow-2xl">
        <p className="text-lg font-bold text-white">Game in progress detected.</p>
        <p className="mt-1 text-sm text-ink-500">
          {savedGame.gameName} · Hand #{savedGame.handNumber}
        </p>
        <p className="mt-3 text-sm text-ink-500">Resume where you left off?</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={resumeSavedGame}
            className="rounded-xl bg-gold-500 py-3 font-bold text-ink-950 hover:bg-gold-400"
          >
            RESUME
          </button>
          <button
            onClick={discardSavedGame}
            className="rounded-xl border border-ink-600 bg-ink-900 py-3 font-medium text-white hover:bg-ink-700"
          >
            START NEW GAME
          </button>
        </div>
      </div>
    </div>
  );
}
