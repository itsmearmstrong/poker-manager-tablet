import { useState } from 'react';
import type { GameState } from '../../types/poker';
import { useGameStore } from '../../store/gameStore';
import { formatChips } from '../../utils/format';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';

interface HostControlPanelProps {
  game: GameState;
  onClose: () => void;
  onOpenHandHistory: () => void;
  onOpenMoneyDashboard: () => void;
}

type ActiveModal =
  | { type: 'adjustChips'; playerId: string }
  | { type: 'rebuy'; playerId: string }
  | { type: 'changeBlinds' }
  | { type: 'removePlayer'; playerId: string }
  | { type: 'restartHand' }
  | { type: 'endGame' }
  | { type: 'manualAward' }
  | null;

export default function HostControlPanel({
  game,
  onClose,
  onOpenHandHistory,
  onOpenMoneyDashboard,
}: HostControlPanelProps) {
  const [modal, setModal] = useState<ActiveModal>(null);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const undo = useGameStore((s) => s.undo);
  const canUndo = useGameStore((s) => s.canUndo());
  const restartCurrentHand = useGameStore((s) => s.restartCurrentHand);
  const toggleSitOut = useGameStore((s) => s.toggleSitOut);
  const endGame = useGameStore((s) => s.endGame);
  const advanceToNextRound = useGameStore((s) => s.advanceToNextRound);
  const movePlayerSeat = useGameStore((s) => s.movePlayerSeat);

  const isPaused = game.status === 'paused';
  const inHand = game.status === 'in_progress' || game.status === 'paused';
  const canAdvance = inHand && game.currentPlayerSeat === null && game.currentRound !== 'showdown';
  const canReseat = game.status === 'hand_complete';

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={onClose}>
        <div
          className="h-full w-full max-w-sm overflow-y-auto border-l border-ink-700 bg-ink-900 p-5 animate-slide-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gold-400">Host Controls</h2>
            <button onClick={onClose} className="text-ink-500 hover:text-white">
              ✕
            </button>
          </div>

          <Section title="Game">
            <HostButton onClick={isPaused ? resumeGame : pauseGame} disabled={!inHand}>
              {isPaused ? 'Resume Game' : 'Pause Game'}
            </HostButton>
            <HostButton onClick={onOpenHandHistory}>View Hand History</HostButton>
            <HostButton onClick={onOpenMoneyDashboard}>Money Dashboard</HostButton>
            <HostButton onClick={() => setModal({ type: 'changeBlinds' })}>Change Blinds</HostButton>
            <HostButton danger onClick={() => setModal({ type: 'endGame' })}>
              End Game
            </HostButton>
          </Section>

          <Section title="Current Hand">
            <HostButton onClick={undo} disabled={!canUndo}>
              ↩ Undo Last Action
            </HostButton>
            <HostButton onClick={advanceToNextRound} disabled={!canAdvance}>
              Advance Round Manually
            </HostButton>
            <HostButton onClick={() => setModal({ type: 'manualAward' })} disabled={game.pots.length === 0}>
              Award Pot Manually
            </HostButton>
            <HostButton danger onClick={() => setModal({ type: 'restartHand' })} disabled={!inHand}>
              Restart Current Hand
            </HostButton>
          </Section>

          <Section title="Players">
            {!canReseat && (
              <p className="mb-2 text-xs text-ink-500">Seats can be reordered between hands.</p>
            )}
            <div className="space-y-2">
              {[...game.players]
                .sort((a, b) => a.seat - b.seat)
                .map((p, i, sorted) => (
                  <div key={p.id} className="rounded-lg border border-ink-700 bg-ink-800 p-2.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => movePlayerSeat(p.id, 'up')}
                            disabled={!canReseat || i === 0}
                            aria-label={`Move ${p.name} up`}
                            className="flex h-4 w-4 items-center justify-center rounded text-ink-500 hover:bg-ink-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => movePlayerSeat(p.id, 'down')}
                            disabled={!canReseat || i === sorted.length - 1}
                            aria-label={`Move ${p.name} down`}
                            className="flex h-4 w-4 items-center justify-center rounded text-ink-500 hover:bg-ink-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                        <span className="text-sm font-medium text-white">
                          Seat {p.seat} — {p.name}
                        </span>
                      </div>
                      <span className="text-xs text-ink-500">{formatChips(p.chips, game.settings)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <SmallButton onClick={() => setModal({ type: 'adjustChips', playerId: p.id })}>
                        Adjust Chips
                      </SmallButton>
                      <SmallButton onClick={() => setModal({ type: 'rebuy', playerId: p.id })}>
                        Add Rebuy
                      </SmallButton>
                      <SmallButton onClick={() => toggleSitOut(p.id)}>
                        {p.sittingOut ? 'Cancel Skip' : 'Skip Next Hand'}
                      </SmallButton>
                      <SmallButton danger onClick={() => setModal({ type: 'removePlayer', playerId: p.id })}>
                        Remove
                      </SmallButton>
                    </div>
                  </div>
                ))}
            </div>
          </Section>
        </div>
      </div>

      {modal?.type === 'adjustChips' && (
        <AdjustChipsModal game={game} playerId={modal.playerId} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'rebuy' && (
        <RebuyModal game={game} playerId={modal.playerId} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'changeBlinds' && (
        <ChangeBlindsModal game={game} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'manualAward' && (
        <ManualAwardModal game={game} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'removePlayer' && (
        <ConfirmDialog
          title="Remove Player"
          message={`Remove ${game.players.find((p) => p.id === modal.playerId)?.name}? This cannot be undone easily.`}
          confirmLabel="Remove"
          onCancel={() => setModal(null)}
          onConfirm={() => {
            useGameStore.getState().removePlayer(modal.playerId);
            setModal(null);
          }}
        />
      )}
      {modal?.type === 'restartHand' && (
        <ConfirmDialog
          title="Restart Current Hand"
          message="Are you sure you want to restart this hand? All betting information for this hand will be lost."
          confirmLabel="Restart Hand"
          onCancel={() => setModal(null)}
          onConfirm={() => {
            restartCurrentHand();
            setModal(null);
          }}
        />
      )}
      {modal?.type === 'endGame' && (
        <ConfirmDialog
          title="End Game"
          message="This will end the game for everyone. Final results will remain viewable."
          confirmLabel="End Game"
          onCancel={() => setModal(null)}
          onConfirm={() => {
            endGame();
            setModal(null);
            onClose();
          }}
        />
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function HostButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? 'border-red-800 text-red-400 hover:bg-red-950'
          : 'border-ink-600 text-white hover:bg-ink-700'
      }`}
    >
      {children}
    </button>
  );
}

function SmallButton({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-xs font-medium ${
        danger
          ? 'border-red-800 text-red-400 hover:bg-red-950'
          : 'border-ink-600 text-ink-500 hover:bg-ink-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function AdjustChipsModal({
  game,
  playerId,
  onClose,
}: {
  game: GameState;
  playerId: string;
  onClose: () => void;
}) {
  const adjustPlayerChips = useGameStore((s) => s.adjustPlayerChips);
  const player = game.players.find((p) => p.id === playerId)!;
  const [delta, setDelta] = useState(0);

  return (
    <Modal title={`Adjust Chips — ${player.name}`} onClose={onClose} width="max-w-sm">
      <p className="mb-3 text-sm text-ink-500">
        Current Stack: <span className="font-semibold text-white">{formatChips(player.chips, game.settings)}</span>
      </p>
      <label className="mb-1 block text-xs text-ink-500">Adjustment (use negative to subtract)</label>
      <input
        type="number"
        value={delta}
        onChange={(e) => setDelta(Number(e.target.value))}
        className="mb-4 w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-white outline-none focus:border-gold-500"
      />
      <p className="mb-4 text-sm text-ink-500">
        New Stack:{' '}
        <span className="font-semibold text-gold-400">
          {formatChips(Math.max(0, player.chips + delta), game.settings)}
        </span>
      </p>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-lg border border-ink-600 py-2.5 text-sm text-white hover:bg-ink-700">
          Cancel
        </button>
        <button
          onClick={() => {
            adjustPlayerChips(playerId, delta);
            onClose();
          }}
          className="flex-1 rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-ink-950 hover:bg-gold-400"
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}

function RebuyModal({ game, playerId, onClose }: { game: GameState; playerId: string; onClose: () => void }) {
  const addRebuy = useGameStore((s) => s.addRebuy);
  const player = game.players.find((p) => p.id === playerId)!;
  const [amount, setAmount] = useState(game.settings.startingStack);

  return (
    <Modal title={`Add Chips — ${player.name}`} onClose={onClose} width="max-w-sm">
      <p className="mb-3 text-sm text-ink-500">
        Current Stack: <span className="font-semibold text-white">{formatChips(player.chips, game.settings)}</span>
      </p>
      <label className="mb-1 block text-xs text-ink-500">Add Chips</label>
      <input
        type="number"
        value={amount}
        min={0}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="mb-4 w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-white outline-none focus:border-gold-500"
      />
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-lg border border-ink-600 py-2.5 text-sm text-white hover:bg-ink-700">
          Cancel
        </button>
        <button
          onClick={() => {
            if (amount > 0) addRebuy(playerId, amount);
            onClose();
          }}
          className="flex-1 rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-ink-950 hover:bg-gold-400"
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}

function ChangeBlindsModal({ game, onClose }: { game: GameState; onClose: () => void }) {
  const changeBlinds = useGameStore((s) => s.changeBlinds);
  const [small, setSmall] = useState(game.blinds.small);
  const [big, setBig] = useState(game.blinds.big);
  const [ante, setAnte] = useState(game.blinds.ante);

  return (
    <Modal title="Change Blinds" onClose={onClose} width="max-w-sm">
      <p className="mb-3 text-xs text-ink-500">Takes effect starting next hand.</p>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-ink-500">Small</label>
          <input
            type="number"
            value={small}
            onChange={(e) => setSmall(Number(e.target.value))}
            className="w-full rounded-lg border border-ink-600 bg-ink-800 px-2 py-2 text-white outline-none focus:border-gold-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Big</label>
          <input
            type="number"
            value={big}
            onChange={(e) => setBig(Number(e.target.value))}
            className="w-full rounded-lg border border-ink-600 bg-ink-800 px-2 py-2 text-white outline-none focus:border-gold-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Ante</label>
          <input
            type="number"
            value={ante}
            onChange={(e) => setAnte(Number(e.target.value))}
            className="w-full rounded-lg border border-ink-600 bg-ink-800 px-2 py-2 text-white outline-none focus:border-gold-500"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-lg border border-ink-600 py-2.5 text-sm text-white hover:bg-ink-700">
          Cancel
        </button>
        <button
          onClick={() => {
            changeBlinds(small, big, ante);
            onClose();
          }}
          className="flex-1 rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-ink-950 hover:bg-gold-400"
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}

function ManualAwardModal({ game, onClose }: { game: GameState; onClose: () => void }) {
  const confirmShowdown = useGameStore((s) => s.confirmShowdown);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  function toggle(potId: string, playerId: string) {
    setSelections((prev) => {
      const current = prev[potId] ?? [];
      const next = current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId];
      return { ...prev, [potId]: next };
    });
  }

  return (
    <Modal title="Award Pot Manually" onClose={onClose} width="max-w-md">
      <p className="mb-3 text-xs text-ink-500">
        Overrides the normal flow — use for host rulings or corrections. This finalizes the hand immediately.
      </p>
      <div className="max-h-80 space-y-3 overflow-y-auto">
        {game.pots.map((pot, i) => (
          <div key={pot.id} className="rounded-lg border border-ink-700 bg-ink-900 p-3">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-white">{i === 0 ? 'Main Pot' : `Side Pot ${i}`}</span>
              <span className="font-bold text-gold-400">{formatChips(pot.amount, game.settings)}</span>
            </div>
            <div className="space-y-1">
              {game.players
                .filter((p) => p.inHand)
                .map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={(selections[pot.id] ?? []).includes(p.id)}
                      onChange={() => toggle(pot.id, p.id)}
                      className="accent-yellow-500"
                    />
                    Seat {p.seat} — {p.name}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          confirmShowdown(selections);
          onClose();
        }}
        disabled={game.pots.some((pot) => (selections[pot.id]?.length ?? 0) === 0)}
        className="mt-4 w-full rounded-xl bg-gold-500 py-2.5 text-sm font-bold text-ink-950 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-30"
      >
        AWARD
      </button>
    </Modal>
  );
}
