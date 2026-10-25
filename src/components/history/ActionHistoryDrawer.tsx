import type { GameState } from '../../types/poker';
import { useAndroidBack } from '../../utils/androidBack';
import ActionHistoryPanel from './ActionHistoryPanel';

interface ActionHistoryDrawerProps {
  game: GameState;
  onClose: () => void;
  onOpenHandHistory: () => void;
}

export default function ActionHistoryDrawer({
  game,
  onClose,
  onOpenHandHistory,
}: ActionHistoryDrawerProps) {
  useAndroidBack(onClose);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={onClose}>
      <aside
        className="flex h-full w-[320px] max-w-full flex-col border-l border-ink-700 bg-ink-900 p-4 animate-slide-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex flex-none items-center justify-between">
          <h2 className="text-lg font-bold text-gold-400">Action History</h2>
          <button
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-500 hover:bg-ink-800 hover:text-white"
            aria-label="Close action history"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <ActionHistoryPanel game={game} showTitle={false} />
        </div>

        <button
          onClick={onOpenHandHistory}
          className="mt-3 min-h-11 flex-none rounded-lg border border-ink-600 px-3 py-2 text-sm font-medium text-white hover:bg-ink-700"
        >
          View Completed Hands
        </button>
      </aside>
    </div>
  );
}
