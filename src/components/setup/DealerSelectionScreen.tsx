import { useState } from 'react';
import type { GameState } from '../../types/poker';
import { formatChips } from '../../utils/format';

interface DealerSelectionScreenProps {
  game: GameState;
  onBack: () => void;
  onStart: (dealerSeat: number) => void;
}

export default function DealerSelectionScreen({ game, onBack, onStart }: DealerSelectionScreenProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const players = [...game.players].sort((a, b) => a.seat - b.seat);
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId);

  return (
    <div className="setup-screen mx-auto flex min-h-full max-w-5xl flex-col px-5 py-5">
      <div className="setup-heading mb-5 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-gold-500">First Hand</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Select the Dealer</h1>
        <p className="mt-2 text-sm text-ink-500">
          The small blind, big blind, and first player to act will be assigned automatically.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {players.map((player) => {
            const selected = player.id === selectedPlayerId;
            return (
              <button
                key={player.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedPlayerId(player.id)}
                className={`min-h-24 rounded-xl border-2 p-3 text-left transition-colors duration-100 ${
                  selected
                    ? 'border-gold-500 bg-gold-500/15 text-white'
                    : 'border-ink-600 bg-ink-800 text-white hover:border-ink-500'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-700 text-xs font-bold">
                    {player.seat}
                  </span>
                  {selected && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-ink-950">
                      D
                    </span>
                  )}
                </div>
                <p className="truncate text-base font-semibold">{player.name}</p>
                <p className="mt-1 text-xs font-medium text-gold-400">
                  {formatChips(player.chips, game.settings)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="setup-actions mt-4 flex flex-none justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 rounded-xl border border-ink-600 px-8 py-3 text-base font-semibold text-white hover:bg-ink-800"
        >
          BACK TO SETUP
        </button>
        <button
          type="button"
          disabled={!selectedPlayer}
          onClick={() => selectedPlayer && onStart(selectedPlayer.seat)}
          className="min-h-12 rounded-xl bg-gold-500 px-10 py-3 text-lg font-bold text-ink-950 shadow-md hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {selectedPlayer ? `START WITH ${selectedPlayer.name} AS DEALER` : 'SELECT A DEALER'}
        </button>
      </div>
    </div>
  );
}
