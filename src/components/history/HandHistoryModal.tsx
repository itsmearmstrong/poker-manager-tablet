import { useState } from 'react';
import type { GameState } from '../../types/poker';
import { formatChips } from '../../utils/format';
import { describeAction } from '../../utils/actionLabel';
import Modal from '../common/Modal';

interface HandHistoryModalProps {
  game: GameState;
  onClose: () => void;
}

export default function HandHistoryModal({ game, onClose }: HandHistoryModalProps) {
  const hands = [...game.handHistory].reverse();
  const [expanded, setExpanded] = useState<number | null>(hands[0]?.handNumber ?? null);

  return (
    <Modal title="Hand History" onClose={onClose} width="max-w-xl">
      <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
        {hands.length === 0 && <p className="text-sm text-ink-500">No completed hands yet.</p>}
        {hands.map((hand) => {
          const isOpen = expanded === hand.handNumber;
          return (
            <div key={hand.handNumber} className="rounded-lg border border-ink-700 bg-ink-900">
              <button
                onClick={() => setExpanded(isOpen ? null : hand.handNumber)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="font-semibold text-white">Hand #{hand.handNumber}</p>
                  <p className="text-xs text-ink-500">
                    Dealer: Seat {hand.dealerSeat} · SB: Seat {hand.smallBlindSeat} · BB: Seat {hand.bigBlindSeat}
                  </p>
                </div>
                <span className="text-sm font-bold text-gold-400">{formatChips(hand.potTotal, game.settings)}</span>
              </button>

              {isOpen && (
                <div className="border-t border-ink-700 px-4 py-3 text-sm">
                  <p className="mb-2 font-medium text-white">
                    Winner:{' '}
                    {hand.pots
                      .flatMap((pot) => pot.winnerIds ?? [])
                      .map((id) => hand.playerSnapshots.find((p) => p.playerId === id)?.name)
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </p>
                  <div className="mb-3 space-y-1">
                    {hand.playerSnapshots.map((p) => (
                      <div key={p.playerId} className="flex justify-between text-ink-500">
                        <span>
                          Seat {p.seat} — {p.name}
                        </span>
                        <span>
                          {formatChips(p.startingChips, game.settings)} → {formatChips(p.endingChips, game.settings)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-ink-500">Actions</p>
                  <div className="space-y-0.5 text-ink-500">
                    {hand.actions.map((a) => (
                      <p key={a.id}>{describeAction(a, game.settings)}</p>
                    ))}
                  </div>
                </div>
              )}
              {!isOpen && (
                <p className="px-4 pb-2 text-xs text-ink-500">
                  Winner:{' '}
                  {hand.pots
                    .flatMap((pot) => pot.winnerIds ?? [])
                    .map((id) => hand.playerSnapshots.find((p) => p.playerId === id)?.name)
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
