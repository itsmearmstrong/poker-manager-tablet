import { useState } from 'react';
import type { GameState } from '../../types/poker';
import { useGameStore } from '../../store/gameStore';
import { formatChips } from '../../utils/format';
import Modal from '../common/Modal';
import ProfileChoice from '../stats/ProfileChoice';

interface AddPlayerToGameModalProps {
  game: GameState;
  onClose: () => void;
}

export default function AddPlayerToGameModal({ game, onClose }: AddPlayerToGameModalProps) {
  const addPlayer = useGameStore((state) => state.addPlayer);
  const [name, setName] = useState('');
  const [profileId,setProfileId]=useState('');
  const [seat, setSeat] = useState<number | null>(null);
  const [startingChips, setStartingChips] = useState(game.settings.startingStack);
  const [error, setError] = useState('');

  const occupiedSeats = new Set(game.players.filter(player => !player.removed).map((player) => player.seat));
  const availableSeats = Array.from({ length: 12 }, (_, index) => index + 1).filter(
    (candidate) => !occupiedSeats.has(candidate),
  );
  const trimmedName = name.trim();
  const duplicateName = game.players.some(
    (player) => Boolean(profileId) && player.profileId===profileId,
  );
  const canConfirm =
    trimmedName.length > 0 &&
    !duplicateName &&
    seat !== null &&
    availableSeats.includes(seat) &&
    Number.isFinite(startingChips) &&
    startingChips > 0;

  return (
    <Modal title="Add Player to Game" onClose={onClose} width="max-w-lg" alignTop>
      <ProfileChoice value={profileId} onChange={p=>{setProfileId(p?.id || '');if(p)setName(p.name);}} />
      <p className="mb-4 text-sm text-ink-400">
        Choose the player and their physical seat. They will be dealt in when the next hand starts.
      </p>

      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">
        Player name
      </label>
      <input
        type="text"
        value={name}
        maxLength={30}
        onChange={(event) => {
          setName(event.target.value);
          setError('');
        }}
        placeholder="Enter player name"
        className="mb-1 min-h-12 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-base text-white outline-none focus:border-gold-500"
      />
      {duplicateName && (
        <p className="mb-3 text-xs font-medium text-red-400">That player is already in this game.</p>
      )}
      {!duplicateName && <div className="mb-3" />}

      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-500">Choose seat</span>
        <span className="text-xs text-ink-500">Occupied seats are unavailable</span>
      </div>
      <div className="mb-4 grid grid-cols-5 gap-2">
        {Array.from({ length: 12 }, (_, index) => index + 1).map((candidate) => {
          const occupied = occupiedSeats.has(candidate);
          const selected = seat === candidate;
          return (
            <button
              key={candidate}
              type="button"
              disabled={occupied}
              onClick={() => {
                setSeat(candidate);
                setError('');
              }}
              className={`min-h-12 rounded-lg border text-sm font-bold transition-colors duration-100 ${
                selected
                  ? 'border-gold-400 bg-gold-500 text-ink-950'
                  : 'border-ink-600 bg-ink-900 text-white hover:border-gold-600'
              } disabled:cursor-not-allowed disabled:border-ink-800 disabled:bg-ink-900/50 disabled:text-ink-700`}
              aria-label={occupied ? `Seat ${candidate}, occupied` : `Choose seat ${candidate}`}
            >
              {candidate}
            </button>
          );
        })}
      </div>

      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">
        Starting chips
      </label>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={startingChips}
        onChange={(event) => {
          setStartingChips(Number(event.target.value));
          setError('');
        }}
        className="min-h-12 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-lg font-semibold text-white outline-none focus:border-gold-500"
      />
      <p className="mb-4 mt-1 text-xs text-ink-500">
        Buy-in: {formatChips(Math.max(0, startingChips || 0), game.settings)}
      </p>

      {availableSeats.length === 0 && (
        <p className="mb-3 rounded-lg border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-400">
          Every seat is occupied. Remove a player before adding another.
        </p>
      )}
      {error && <p className="mb-3 text-sm font-medium text-red-400">{error}</p>}

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
            if (!canConfirm || seat === null) return;
            try {
              addPlayer(trimmedName, seat, startingChips,profileId || undefined);
              onClose();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'Unable to add this player.');
            }
          }}
          className="min-h-12 flex-[2] rounded-lg bg-gold-500 py-2.5 text-sm font-bold text-ink-950 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ADD TO SEAT {seat ?? '—'}
        </button>
      </div>
    </Modal>
  );
}
