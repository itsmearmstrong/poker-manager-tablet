import { useState } from 'react';
import type { GameState } from '../../types/poker';
import { useGameStore } from '../../store/gameStore';
import { formatChips } from '../../utils/format';

interface ShowdownPanelProps {
  game: GameState;
}

export default function ShowdownPanel({ game }: ShowdownPanelProps) {
  const confirmShowdown = useGameStore((s) => s.confirmShowdown);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  function toggle(potId: string, playerId: string) {
    setSelections((prev) => {
      const current = prev[potId] ?? [];
      const next = current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId];
      return { ...prev, [potId]: next };
    });
  }

  const allDecided = game.pots.every((pot) => (selections[pot.id]?.length ?? 0) > 0);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-4">
      <h2 className="mb-3 text-center text-lg font-bold text-gold-400">SHOWDOWN — Select Winner{game.pots.length > 1 ? 's' : ''}</h2>

      <div className="space-y-4">
        {game.pots.map((pot, i) => (
          <div key={pot.id} className="rounded-xl border border-ink-700 bg-ink-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-white">
                {i === 0 ? 'Main Pot' : `Side Pot ${i}`}
              </span>
              <span className="font-bold text-gold-400">{formatChips(pot.amount, game.settings)}</span>
            </div>
            <div className="space-y-1.5">
              {pot.eligiblePlayerIds.map((playerId) => {
                const player = game.players.find((p) => p.id === playerId)!;
                const checked = (selections[pot.id] ?? []).includes(playerId);
                return (
                  <label
                    key={playerId}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      checked ? 'border-gold-500 bg-gold-500/10 text-gold-300' : 'border-ink-700 text-white hover:border-ink-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(pot.id, playerId)}
                      className="accent-yellow-500"
                    />
                    Seat {player.seat} — {player.name}
                  </label>
                );
              })}
            </div>
            {(selections[pot.id]?.length ?? 0) > 1 && (
              <p className="mt-1.5 text-xs text-ink-500">Split pot — chips divided evenly among selected winners.</p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => confirmShowdown(selections)}
        disabled={!allDecided}
        className="mt-5 w-full rounded-xl bg-gold-500 py-3 text-base font-bold text-ink-950 shadow-lg hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-30"
      >
        AWARD POT{game.pots.length > 1 ? 'S' : ''}
      </button>
    </div>
  );
}
