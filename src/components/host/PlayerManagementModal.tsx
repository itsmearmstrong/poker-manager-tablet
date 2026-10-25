import { useState } from 'react';
import type { GameState } from '../../types/poker';
import { useGameStore } from '../../store/gameStore';
import { formatChips } from '../../utils/format';
import ConfirmDialog from '../common/ConfirmDialog';
import Modal from '../common/Modal';
import PlayerStats from '../stats/PlayerStats';

type View = 'menu' | 'rename' | 'adjust' | 'rebuy' | 'remove';

interface PlayerManagementModalProps {
  game: GameState;
  playerId: string;
  onClose: () => void;
}

export default function PlayerManagementModal({ game, playerId, onClose }: PlayerManagementModalProps) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  const toggleSitOut = useGameStore((state) => state.toggleSitOut);
  const [view, setView] = useState<View>('menu');
  const [stats,setStats]=useState(false);
  if (!player) return null;
  if(stats)return <PlayerStats initialProfileId={player.profileId} onClose={()=>setStats(false)} />;

  if (view === 'remove') {
    return (
      <ConfirmDialog
        title="Remove Player"
        message={`Remove ${player.name}? They will be excluded from future hands. If they are still in this hand, they will fold.`}
        confirmLabel="Remove"
        onCancel={() => setView('menu')}
        onConfirm={() => {
          useGameStore.getState().removePlayer(playerId);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal
      title={view === 'menu' ? player.name : viewTitle(view, player.name)}
      onClose={onClose}
      width={view === 'menu' ? 'max-w-md' : 'max-w-sm'}
      alignTop
    >
      {view === 'menu' ? (
        <>
          <div className="mb-4 flex items-center justify-between rounded-lg border border-ink-700 bg-ink-900 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-500">Seat {player.seat}</p>
              <p className="text-sm text-ink-400">
                {player.status === 'out' ? 'Eliminated' : player.sittingOut ? 'Skipping next hand' : 'Active'}
              </p>
            </div>
            <p className="text-xl font-bold text-gold-400">{formatChips(player.chips, game.settings)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ActionButton onClick={()=>setStats(true)}>PLAYER STATS / PROFILE</ActionButton>
            <ActionButton onClick={() => setView('rename')}>EDIT NAME</ActionButton>
            <ActionButton onClick={() => setView('adjust')}>ADJUST CHIPS</ActionButton>
            <ActionButton onClick={() => setView('rebuy')}>REBUY / ADD CHIPS</ActionButton>
            <ActionButton
              active={player.sittingOut}
              onClick={() => toggleSitOut(playerId)}
            >
              {player.sittingOut ? 'CANCEL SKIP' : 'SKIP NEXT HAND'}
            </ActionButton>
            <button
              type="button"
              onClick={() => setView('remove')}
              className="col-span-2 min-h-12 rounded-lg border border-red-800 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-950"
            >
              REMOVE PLAYER
            </button>
          </div>
        </>
      ) : view === 'rename' ? (
        <RenameForm game={game} playerId={playerId} onDone={() => setView('menu')} />
      ) : view === 'adjust' ? (
        <AdjustChipsForm game={game} playerId={playerId} onDone={() => setView('menu')} />
      ) : (
        <RebuyForm game={game} playerId={playerId} onDone={() => setView('menu')} />
      )}
    </Modal>
  );
}

function viewTitle(view: Exclude<View, 'menu' | 'remove'>, name: string): string {
  if (view === 'rename') return `Edit Name — ${name}`;
  if (view === 'adjust') return `Adjust Chips — ${name}`;
  return `Rebuy — ${name}`;
}

function ActionButton({
  children,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-14 rounded-lg border px-4 py-3 text-sm font-bold ${
        active
          ? 'border-gold-600 bg-gold-500/10 text-gold-400'
          : 'border-ink-600 text-white hover:bg-ink-700'
      }`}
    >
      {children}
    </button>
  );
}

function RenameForm({ game, playerId, onDone }: FormProps) {
  const renamePlayer = useGameStore((state) => state.renamePlayer);
  const player = game.players.find((candidate) => candidate.id === playerId)!;
  const [name, setName] = useState(player.name);
  const trimmedName = name.trim();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!trimmedName || trimmedName === player.name) return;
        renamePlayer(playerId, trimmedName);
        onDone();
      }}
    >
      <label className="mb-1 block text-xs uppercase tracking-wide text-ink-500">Player name</label>
      <input
        type="text"
        value={name}
        maxLength={24}
        onChange={(event) => setName(event.target.value)}
        className="mb-4 min-h-12 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-base text-white outline-none focus:border-gold-500"
      />
      <FormActions
        confirmLabel="SAVE NAME"
        disabled={!trimmedName || trimmedName === player.name}
        onCancel={onDone}
      />
    </form>
  );
}

function AdjustChipsForm({ game, playerId, onDone }: FormProps) {
  const adjustPlayerChips = useGameStore((state) => state.adjustPlayerChips);
  const player = game.players.find((candidate) => candidate.id === playerId)!;
  const [delta, setDelta] = useState(0);

  return (
    <>
      <p className="mb-3 text-sm text-ink-500">
        Current stack: <span className="font-semibold text-white">{formatChips(player.chips, game.settings)}</span>
      </p>
      <label className="mb-1 block text-xs uppercase tracking-wide text-ink-500">
        Adjustment — use negative to subtract
      </label>
      <input
        type="number"
        inputMode="numeric"
        value={delta}
        onChange={(event) => setDelta(Number(event.target.value))}
        className="mb-3 min-h-12 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-base text-white outline-none focus:border-gold-500"
      />
      <p className="mb-4 text-sm text-ink-500">
        New stack:{' '}
        <span className="font-bold text-gold-400">
          {formatChips(Math.max(0, player.chips + delta), game.settings)}
        </span>
      </p>
      <FormActions
        confirmLabel="CONFIRM"
        disabled={!Number.isFinite(delta) || delta === 0}
        onCancel={onDone}
        onConfirm={() => {
          adjustPlayerChips(playerId, delta);
          onDone();
        }}
      />
    </>
  );
}

function RebuyForm({ game, playerId, onDone }: FormProps) {
  const addRebuy = useGameStore((state) => state.addRebuy);
  const player = game.players.find((candidate) => candidate.id === playerId)!;
  const [amount, setAmount] = useState(game.settings.startingStack);

  return (
    <>
      <p className="mb-3 text-sm text-ink-500">
        Current stack: <span className="font-semibold text-white">{formatChips(player.chips, game.settings)}</span>
      </p>
      <label className="mb-1 block text-xs uppercase tracking-wide text-ink-500">Add chips</label>
      <input
        type="number"
        inputMode="numeric"
        value={amount}
        min={1}
        onChange={(event) => setAmount(Number(event.target.value))}
        className="mb-3 min-h-12 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-base text-white outline-none focus:border-gold-500"
      />
      <p className="mb-4 text-sm text-ink-500">
        New stack:{' '}
        <span className="font-bold text-gold-400">
          {formatChips(player.chips + Math.max(0, amount || 0), game.settings)}
        </span>
      </p>
      <FormActions
        confirmLabel="CONFIRM REBUY"
        disabled={!Number.isFinite(amount) || amount <= 0}
        onCancel={onDone}
        onConfirm={() => {
          addRebuy(playerId, amount);
          onDone();
        }}
      />
    </>
  );
}

interface FormProps {
  game: GameState;
  playerId: string;
  onDone: () => void;
}

function FormActions({
  confirmLabel,
  disabled = false,
  onCancel,
  onConfirm,
}: {
  confirmLabel: string;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm?: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="min-h-12 flex-1 rounded-lg border border-ink-600 py-2.5 text-sm font-semibold text-white hover:bg-ink-700"
      >
        BACK
      </button>
      <button
        type={onConfirm ? 'button' : 'submit'}
        disabled={disabled}
        onClick={onConfirm}
        className="min-h-12 flex-1 rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-ink-950 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
