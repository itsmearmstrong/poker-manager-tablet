import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getHandOutcome } from '../../gameEngine/handManager';
import { formatChips } from '../../utils/format';
import PokerTable from './PokerTable';
import ActionBar from '../betting/ActionBar';
import RoundControl from '../showdown/RoundControl';
import ShowdownPanel from '../showdown/ShowdownPanel';
import HandCompleteSummary from '../showdown/HandCompleteSummary';
import ActionHistoryDrawer from '../history/ActionHistoryDrawer';
import HandHistoryModal from '../history/HandHistoryModal';
import MoneyDashboard from '../dashboard/MoneyDashboard';
import HostControlPanel from '../host/HostControlPanel';
import EndedScreen from './EndedScreen';
import PlayerManagementModal from '../host/PlayerManagementModal';

export default function GameScreen() {
  const game = useGameStore((s) => s.game);
  const [showHost, setShowHost] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showActionHistory, setShowActionHistory] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [managedPlayerId, setManagedPlayerId] = useState<string | null>(null);

  if (!game) return null;
  if (game.status === 'ended') return <EndedScreen />;

  const outcome = getHandOutcome(game);
  const currentPlayer = game.players.find((p) => p.seat === game.currentPlayerSeat);

  return (
    <div className="game-screen flex min-h-full flex-col">
      <header className="game-header flex items-center justify-between border-b border-ink-700 bg-ink-900 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">{game.gameName.toUpperCase()}</p>
          <p className="text-xs text-ink-500">
            HAND #{game.handNumber} · Blinds {formatChips(game.blinds.small, game.settings)}/
            {formatChips(game.blinds.big, game.settings)}
            {game.status === 'paused' && <span className="ml-2 text-gold-500">PAUSED</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowActionHistory(true)}
            className="min-h-11 rounded-lg border border-ink-600 px-4 py-1.5 text-sm text-white hover:bg-ink-700"
          >
            History
          </button>
          <button
            onClick={() => setShowDashboard(true)}
            className="min-h-11 rounded-lg border border-ink-600 px-4 py-1.5 text-sm text-white hover:bg-ink-700"
          >
            Money
          </button>
          <button
            onClick={() => setShowHost(true)}
            className="min-h-11 rounded-lg border border-gold-600/50 px-4 py-1.5 text-sm font-medium text-gold-400 hover:bg-ink-700"
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      <main className="game-main mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 lg:flex-row">
        <div className="game-primary flex flex-1 flex-col gap-3">
          <PokerTable key={game.handNumber} game={game} onOpenPlayer={setManagedPlayerId} />

          <div className="game-controls rounded-xl border border-ink-700 bg-ink-900/60">
            {game.status === 'hand_complete' ? (
              <HandCompleteSummary game={game} />
            ) : outcome === 'awaiting_showdown' ? (
              <ShowdownPanel game={game} />
            ) : currentPlayer ? (
              <ActionBar game={game} />
            ) : (
              <RoundControl game={game} />
            )}
          </div>
        </div>

      </main>

      {showActionHistory && (
        <ActionHistoryDrawer
          game={game}
          onClose={() => setShowActionHistory(false)}
          onOpenHandHistory={() => {
            setShowActionHistory(false);
            setShowHistory(true);
          }}
        />
      )}

      {showHost && (
        <HostControlPanel
          game={game}
          onClose={() => setShowHost(false)}
          onOpenHandHistory={() => {
            setShowHost(false);
            setShowHistory(true);
          }}
          onOpenMoneyDashboard={() => {
            setShowHost(false);
            setShowDashboard(true);
          }}
        />
      )}
      {showHistory && <HandHistoryModal game={game} onClose={() => setShowHistory(false)} />}
      {showDashboard && <MoneyDashboard game={game} onClose={() => setShowDashboard(false)} />}
      {managedPlayerId && (
        <PlayerManagementModal
          game={game}
          playerId={managedPlayerId}
          onClose={() => setManagedPlayerId(null)}
        />
      )}
    </div>
  );
}
