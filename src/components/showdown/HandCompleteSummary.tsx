import { useState } from 'react';
import type { GameState } from '../../types/poker';
import { useGameStore } from '../../store/gameStore';
import { formatChips } from '../../utils/format';
import Modal from '../common/Modal';
import AddPlayerToGameModal from '../host/AddPlayerToGameModal';

interface HandCompleteSummaryProps {
  game: GameState;
}

export default function HandCompleteSummary({ game }: HandCompleteSummaryProps) {
  const startNextHand = useGameStore((state) => state.startNextHand);
  const undo = useGameStore((state) => state.undo);
  const canUndo = useGameStore((state) => state.canUndo());
  const [isOpen, setIsOpen] = useState(true);
  const [rebuyPlayerId, setRebuyPlayerId] = useState<string | null>(null);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const hand = game.handHistory[game.handHistory.length - 1];
  if (!hand) return null;

  const eliminated = game.players.filter((p) => p.status === 'out' && !p.removed);
  const hasEmptySeat = Array.from(
    { length: 12 },
    (_, index) => index + 1,
  ).some((seat) => !game.players.some((player) => !player.removed && player.seat === seat));

  if (!isOpen) {
    return (
      <div className="p-3">
        <p className="mb-2 text-center text-xs font-medium text-gold-400">
          BETWEEN HANDS · Drag one player card onto another to swap their seats
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="min-h-12 flex-1 rounded-xl border border-ink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-ink-700"
          >
            VIEW HAND RESULT
          </button>
          <button
            type="button"
            onClick={startNextHand}
            className="min-h-12 flex-[2] rounded-xl bg-gold-500 px-4 py-3 text-base font-bold text-ink-950 shadow-md hover:bg-gold-400"
          >
            START NEXT HAND
          </button>
        </div>
      </div>
    );
  }

  const rebuyPlayer = game.players.find((player) => player.id === rebuyPlayerId);

  return (
    <>
    <Modal
      title={`Hand #${hand.handNumber} Complete`}
      onClose={() => setIsOpen(false)}
      width="max-w-2xl"
      contentClassName="flex h-[calc(100vh-2rem)] flex-col overflow-hidden"
    >
      <div className="mb-3 flex flex-none items-center justify-between rounded-lg border border-gold-600/40 bg-gold-500/10 px-4 py-3 animate-pot-award">
        <span className="text-sm font-medium text-ink-300">Total awarded</span>
        <span className="text-2xl font-bold text-gold-400">
          {formatChips(hand.potTotal, game.settings)}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {hand.pots.map((pot, index) => (
          <section
            key={pot.id}
            className="flex min-h-14 items-center justify-between gap-4 rounded-lg border border-ink-700 bg-ink-900 px-4 py-2"
          >
            <span className="shrink-0 text-sm text-ink-500">
              {index === 0 ? 'Main Pot' : `Side Pot ${index}`}
            </span>
            <div className="text-right">
              {pot.winnerIds?.map((id) => {
                const player = game.players.find((candidate) => candidate.id === id);
                return (
                  <span key={id} className="ml-3 inline-block font-semibold text-gold-400">
                    {player?.name} (+{formatChips(pot.amountWon?.[id] ?? 0, game.settings)})
                  </span>
                );
              })}
            </div>
          </section>
        ))}

        {eliminated.length > 0 && (
          <section className="rounded-lg border border-red-900/60 bg-red-950/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Eliminated Players</p>
              <p className="text-xs text-ink-500">Rebuy returns them for the next hand</p>
            </div>
            <div className="space-y-2">
              {eliminated.map((player) => (
                <div
                  key={player.id}
                  className="flex min-h-14 items-center justify-between rounded-lg border border-red-900/50 bg-ink-900 px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-white">{player.name}</p>
                    <p className="text-xs text-red-400">Out · {formatChips(player.chips, game.settings)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRebuyPlayerId(player.id)}
                    className="min-h-11 rounded-lg border border-gold-600 bg-gold-500/10 px-5 text-sm font-bold text-gold-400 hover:bg-gold-500/20"
                  >
                    REBUY
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="mt-4 flex flex-none gap-2 border-t border-ink-700 pt-4">
        <button
          type="button"
          onClick={() => setIsAddingPlayer(true)}
          disabled={!hasEmptySeat}
          className="min-h-12 flex-1 rounded-xl border border-gold-600/60 px-3 py-3 text-sm font-semibold text-gold-400 hover:bg-gold-500/10 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ＋ ADD PLAYER
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="min-h-12 flex-1 rounded-xl border border-ink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-ink-700"
        >
          ARRANGE PLAYERS
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
          ↩ UNDO AWARD
        </button>
        <button
          type="button"
          onClick={startNextHand}
          className="min-h-12 flex-[2] rounded-xl bg-gold-500 px-4 py-3 text-base font-bold text-ink-950 shadow-md hover:bg-gold-400"
        >
          START NEXT HAND
        </button>
      </div>
    </Modal>

    {rebuyPlayer && (
      <EliminatedRebuyModal
        game={game}
        playerId={rebuyPlayer.id}
        onClose={() => setRebuyPlayerId(null)}
      />
    )}
    {isAddingPlayer && (
      <AddPlayerToGameModal game={game} onClose={() => setIsAddingPlayer(false)} />
    )}
    </>
  );
}

function EliminatedRebuyModal({
  game,
  playerId,
  onClose,
}: {
  game: GameState;
  playerId: string;
  onClose: () => void;
}) {
  const addRebuy = useGameStore((state) => state.addRebuy);
  const player = game.players.find((candidate) => candidate.id === playerId)!;
  const [amount, setAmount] = useState(game.settings.startingStack);
  const canConfirm = Number.isFinite(amount) && amount > 0;

  return (
    <Modal title={`Rebuy — ${player.name}`} onClose={onClose} width="max-w-sm" alignTop>
      <p className="mb-3 text-sm text-ink-500">
        Add chips now and return {player.name} as an active player for the next hand.
      </p>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">
        Rebuy chips
      </label>
      <input
        type="number"
        inputMode="numeric"
        value={amount}
        min={1}
        onChange={(event) => setAmount(Number(event.target.value))}
        className="mb-3 min-h-12 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-lg font-semibold text-white outline-none focus:border-gold-500"
      />
      <p className="mb-4 text-sm text-ink-500">
        New stack:{' '}
        <span className="font-bold text-gold-400">
          {formatChips(player.chips + Math.max(0, amount || 0), game.settings)}
        </span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 flex-1 rounded-lg border border-ink-600 py-2.5 text-sm font-semibold text-white hover:bg-ink-700"
        >
          CANCEL
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            addRebuy(playerId, amount);
            onClose();
          }}
          className="min-h-12 flex-1 rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-ink-950 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          CONFIRM REBUY
        </button>
      </div>
    </Modal>
  );
}
