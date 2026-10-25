import { useState } from 'react';
import type { GameState } from '../../types/poker';
import { useGameStore } from '../../store/gameStore';
import { formatChips } from '../../utils/format';
import Modal from '../common/Modal';

interface ShowdownPanelProps {
  game: GameState;
}

export default function ShowdownPanel({ game }: ShowdownPanelProps) {
  const confirmShowdown = useGameStore((state) => state.confirmShowdown);
  const undo = useGameStore((state) => state.undo);
  const canUndo = useGameStore((state) => state.canUndo());
  const [isOpen, setIsOpen] = useState(true);
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const automaticSelections: Record<string, string[]> = {};
    for (const pot of game.pots) {
      if (pot.eligiblePlayerIds.length === 1) {
        automaticSelections[pot.id] = [pot.eligiblePlayerIds[0]];
      }
    }
    return automaticSelections;
  });
  const [splitPots, setSplitPots] = useState<Record<string, boolean>>({});

  function selectPlayer(potId: string, playerId: string) {
    setSelections((previous) => {
      const current = previous[potId] ?? [];
      if (!splitPots[potId]) {
        return { ...previous, [potId]: current[0] === playerId ? [] : [playerId] };
      }

      const next = current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId];
      return { ...previous, [potId]: next };
    });
  }

  function toggleSplitPot(potId: string) {
    const enabled = !splitPots[potId];
    setSplitPots((previous) => ({ ...previous, [potId]: enabled }));
    if (!enabled) {
      setSelections((current) => ({
        ...current,
        [potId]: current[potId]?.slice(0, 1) ?? [],
      }));
    }
  }

  const allDecided = game.pots.every((pot) => (selections[pot.id]?.length ?? 0) > 0);
  const totalPot = game.pots.reduce((total, pot) => total + pot.amount, 0);

  if (!isOpen) {
    return (
      <div className="flex justify-center py-3">
        <button
          onClick={() => setIsOpen(true)}
          className="min-h-12 rounded-xl bg-gold-500 px-8 py-3 text-base font-bold text-ink-950 shadow-md hover:bg-gold-400 active:scale-95"
        >
          SELECT SHOWDOWN WINNERS
        </button>
      </div>
    );
  }

  return (
    <Modal
      title="Select Showdown Winners"
      onClose={() => setIsOpen(false)}
      width="max-w-3xl"
      contentClassName="flex h-[calc(100vh-2rem)] flex-col overflow-hidden"
    >
      <div className="mb-3 flex flex-none items-center justify-between rounded-lg border border-ink-700 bg-ink-900 px-4 py-2">
        <span className="text-sm text-ink-500">Total in play</span>
        <span className="text-xl font-bold text-gold-400">{formatChips(totalPot, game.settings)}</span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {game.pots.map((pot, index) => {
          const selected = selections[pot.id] ?? [];
          const isSplit = splitPots[pot.id] ?? false;
          const isAutomaticWinner = pot.eligiblePlayerIds.length === 1;
          const share = selected.length > 0 ? Math.floor(pot.amount / selected.length) : 0;

          return (
            <section key={pot.id} className="rounded-xl border border-ink-700 bg-ink-900 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold uppercase tracking-wide text-white">
                    {index === 0 ? 'Main Pot' : `Side Pot ${index}`}
                  </h3>
                  <p className="text-xs text-ink-500">
                    {isSplit ? 'Select every player sharing this pot' : 'Tap the winning player'}
                  </p>
                </div>
                <span className="text-lg font-bold text-gold-400">
                  {formatChips(pot.amount, game.settings)}
                </span>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                {pot.eligiblePlayerIds.map((playerId) => {
                  const player = game.players.find((candidate) => candidate.id === playerId)!;
                  const isSelected = selected.includes(playerId);

                  return (
                    <button
                      key={playerId}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={isAutomaticWinner}
                      onClick={() => selectPlayer(pot.id, playerId)}
                      className={`flex min-h-14 items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors duration-100 ${
                        isSelected
                          ? 'border-gold-500 bg-gold-500/15 text-white'
                          : 'border-ink-600 bg-ink-800 text-white hover:border-ink-500'
                      }`}
                    >
                      <span>
                        <span className="block text-xs text-ink-500">Seat {player.seat}</span>
                        <span className="block font-semibold">{player.name}</span>
                      </span>
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold ${
                          isSelected
                            ? 'border-gold-500 bg-gold-500 text-ink-950'
                            : 'border-ink-600 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-ink-700 pt-2">
                {isAutomaticWinner ? (
                  <span className="text-sm font-medium text-gold-400">✓ Selected automatically</span>
                ) : (
                  <button
                    type="button"
                    aria-pressed={isSplit}
                    onClick={() => toggleSplitPot(pot.id)}
                    className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-medium ${
                      isSplit
                        ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                        : 'border-ink-600 text-white hover:bg-ink-800'
                    }`}
                  >
                    {isSplit ? '✓ Split Pot Enabled' : 'Split Pot'}
                  </button>
                )}

                <p className="ml-3 text-right text-xs text-ink-500">
                  {isAutomaticWinner
                    ? 'Only eligible player'
                    : selected.length === 0
                    ? 'Winner required'
                    : selected.length === 1
                      ? '1 winner selected'
                      : `${selected.length} winners · ${formatChips(share, game.settings)} each`}
                </p>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-4 flex flex-none gap-2 border-t border-ink-700 pt-4">
        <button
          onClick={() => setIsOpen(false)}
          className="min-h-12 flex-1 rounded-xl border border-ink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-ink-700"
        >
          REVIEW TABLE
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            window.setTimeout(undo, 0);
          }}
          disabled={!canUndo}
          className="min-h-12 flex-1 rounded-xl border border-gold-600/60 px-4 py-3 text-sm font-semibold text-gold-400 hover:bg-gold-500/10 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↩ UNDO
        </button>
        <button
          onClick={() => confirmShowdown(selections)}
          disabled={!allDecided}
          className="min-h-12 flex-[2] rounded-xl bg-gold-500 px-4 py-3 text-base font-bold text-ink-950 shadow-lg hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          AWARD {formatChips(totalPot, game.settings)}
        </button>
      </div>
    </Modal>
  );
}
