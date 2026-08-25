import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getHandOutcome } from '../../gameEngine/handManager';
import { formatChips } from '../../utils/format';
import PokerTable from './PokerTable';
import ActionBar from '../betting/ActionBar';
import RoundControl from '../showdown/RoundControl';
import ShowdownPanel from '../showdown/ShowdownPanel';
import HandCompleteSummary from '../showdown/HandCompleteSummary';
import ActionHistoryPanel from '../history/ActionHistoryPanel';
import HandHistoryModal from '../history/HandHistoryModal';
import MoneyDashboard from '../dashboard/MoneyDashboard';
import HostControlPanel from '../host/HostControlPanel';
import EndedScreen from './EndedScreen';

export default function GameScreen() {
  const game = useGameStore((s) => s.game);
  const [showHost, setShowHost] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  if (!game) return null;
  if (game.status === 'ended') return <EndedScreen />;

  const outcome = getHandOutcome(game);
  const currentPlayer = game.players.find((p) => p.seat === game.currentPlayerSeat);
  const roundLabel = game.currentRound.toUpperCase().replace('PRE', 'PRE-');

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-ink-700 bg-ink-900 px-4 py-3">
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
            onClick={() => setShowHistory(true)}
            className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-white hover:bg-ink-700"
          >
            History
          </button>
          <button
            onClick={() => setShowDashboard(true)}
            className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-white hover:bg-ink-700"
          >
            Money
          </button>
          <button
            onClick={() => setShowHost(true)}
            className="rounded-lg border border-gold-600/50 px-3 py-1.5 text-xs font-medium text-gold-400 hover:bg-ink-700"
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 lg:flex-row">
        <div className="flex flex-1 flex-col gap-3">
          <PokerTable game={game} />

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 rounded-xl border border-ink-700 bg-ink-900 px-4 py-2 text-center text-sm">
            <span className="font-semibold text-gold-400">{roundLabel}</span>
            <span className="text-white">Pot: {formatChips(game.pots.reduce((s, p) => s + p.amount, 0), game.settings)}</span>
            <span className="text-ink-500">
              {game.status === 'hand_complete'
                ? 'Hand complete'
                : outcome === 'awaiting_showdown'
                  ? 'Showdown'
                  : currentPlayer
                    ? `Current Turn: ${currentPlayer.name}`
                    : 'Waiting to advance'}
            </span>
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-900/60">
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

        <aside className="h-56 w-full lg:h-auto lg:w-72">
          <ActionHistoryPanel game={game} />
        </aside>
      </main>

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
    </div>
  );
}
