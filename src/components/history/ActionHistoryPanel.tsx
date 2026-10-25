import type { GameState } from '../../types/poker';
import { describeAction } from '../../utils/actionLabel';

interface ActionHistoryPanelProps {
  game: GameState;
  showTitle?: boolean;
}

export default function ActionHistoryPanel({ game, showTitle = true }: ActionHistoryPanelProps) {
  const actions = [...game.actionHistory].reverse();

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-ink-700 bg-ink-900">
      {showTitle && (
        <div className="border-b border-ink-700 px-3 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gold-500">Action History</h3>
        </div>
      )}
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2 text-sm">
        {actions.length === 0 && <p className="text-ink-500">No actions yet.</p>}
        {actions.map((a) => (
          <p key={a.id} className="animate-slide-in text-ink-500">
            <span className="text-white">{describeAction(a, game.settings)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
