import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { loadPlayerRoster, savePlayerRoster } from '../../store/playerRoster';
import type { Profile } from '../../types/stats';
import PlayerStats from '../stats/PlayerStats';
import ProfileChoice from '../stats/ProfileChoice';
import { formatChips } from '../../utils/format';
import { useDragReorder } from '../../utils/useDragReorder';
import DealerSelectionScreen from './DealerSelectionScreen';
import SavedPlayersModal from './SavedPlayersModal';

export default function SetupScreen() {
  const game = useGameStore((s) => s.game);
  const beginSetup = useGameStore((s) => s.beginSetup);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const addPlayer = useGameStore((s) => s.addPlayer);
  const removePlayerFromSetup = useGameStore((s) => s.removePlayerFromSetup);
  const movePlayerSeat = useGameStore((s) => s.movePlayerSeat);
  const startGame = useGameStore((s) => s.startGame);

  const [name, setName] = useState('');
  const [profileId,setProfileId]=useState('');
  const [showStats,setShowStats]=useState(false);
  const [selectingDealer, setSelectingDealer] = useState(false);
  const [savedNames, setSavedNames] = useState(loadPlayerRoster);
  const [showSavedPlayers, setShowSavedPlayers] = useState(false);
  const { draggedIndex: draggedPlayerIndex, getReorderProps: getPlayerReorderProps } = useDragReorder(
    'setup-players',
    reorderActivePlayer,
  );

  useEffect(() => {
    if (!game) beginSetup();
  }, [game, beginSetup]);

  if (!game) return null;
  const { settings, players } = game;

  if (selectingDealer) {
    return <DealerSelectionScreen game={game} onBack={() => setSelectingDealer(false)} onStart={startGame} />;
  }

  const nextSeat = (() => {
    const taken = new Set(players.map((p) => p.seat));
    for (let s = 1; s <= settings.maxPlayers; s++) if (!taken.has(s)) return s;
    return null;
  })();

  const canAddMore = players.length < settings.maxPlayers;

  function addPlayerByName(playerName: string, seat = nextSeat, selectedId?: string): boolean {
    const trimmedName = playerName.trim();
    if (!trimmedName || seat === null) return false;
    if (selectedId && players.some(player=>player.profileId===selectedId)) return false;
    addPlayer(trimmedName, seat, settings.startingStack, selectedId);
    setSavedNames(loadPlayerRoster());
    return true;
  }

  function handleAddPlayer() {
    if (!name.trim()) return;
    if (addPlayerByName(name,nextSeat,profileId || undefined)) { setName(''); setProfileId(''); }
  }

  function addAllSavedPlayers() {
    const activeNames = new Set(players.map((player) => player.profileId));
    const takenSeats = new Set(players.map((player) => player.seat));
    const openSeats: number[] = [];
    for (let seat = 1; seat <= settings.maxPlayers; seat += 1) {
      if (!takenSeats.has(seat)) openSeats.push(seat);
    }

    for (const savedName of savedNames) {
      if (openSeats.length === 0) break;
      if (activeNames.has(savedName.id)) continue;
      addPlayer(savedName.name, openSeats.shift()!, settings.startingStack,savedName.id);
      activeNames.add(savedName.id);
    }
  }

  function reorderActivePlayer(fromIndex: number, toIndex: number) {
    const sorted = [...players].sort((a, b) => a.seat - b.seat);
    const player = sorted[fromIndex];
    if (!player || toIndex < 0 || toIndex >= sorted.length) return;
    const direction = fromIndex < toIndex ? 'down' : 'up';
    for (let step = 0; step < Math.abs(toIndex - fromIndex); step += 1) {
      movePlayerSeat(player.id, direction);
    }
  }

  function reorderSavedPlayers(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= savedNames.length) return;
    const reordered = [...savedNames];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setSavedNames(savePlayerRoster(reordered));
  }

  function forgetSavedPlayer(index: number) {
    setSavedNames(savePlayerRoster(savedNames.filter((_, savedIndex) => savedIndex !== index)));
  }

  return (
    <div className="setup-screen mx-auto min-h-full max-w-3xl px-4 py-8">
      <div className="setup-heading mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-gold-500">Poker Table Manager</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Game Setup</h1>
      </div>

      <div className="setup-grid">
      <section className="setup-panel mb-6 rounded-xl border border-ink-700 bg-ink-900 p-5">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">
          Game Name
        </label>
        <input
          value={settings.gameName}
          onChange={(e) => updateSettings({ gameName: e.target.value })}
          placeholder="Friday Poker Night"
          className="min-h-11 w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-white outline-none focus:border-gold-500"
        />

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Starting Stack">
            <NumberInput
              value={settings.startingStack}
              onChange={(v) => updateSettings({ startingStack: v })}
            />
          </Field>
          <Field label="Small Blind">
            <NumberInput value={settings.smallBlind} onChange={(v) => updateSettings({ smallBlind: v })} />
          </Field>
          <Field label="Big Blind">
            <NumberInput value={settings.bigBlind} onChange={(v) => updateSettings({ bigBlind: v })} />
          </Field>
          <Field label="Ante (optional)">
            <NumberInput value={settings.ante} onChange={(v) => updateSettings({ ante: v })} />
          </Field>
          <Field label="Chip Value">
            <div className="flex items-center gap-1 text-sm text-ink-500">
              <span>1 chip =</span>
              <NumberInput value={settings.chipValue} onChange={(v) => updateSettings({ chipValue: v || 1 })} />
            </div>
          </Field>
          <Field label="Max Players">
            <NumberInput
              value={settings.maxPlayers}
              onChange={(v) => updateSettings({ maxPlayers: Math.max(players.length, Math.min(12, v)) })}
              max={12}
              min={2}
            />
          </Field>
        </div>
        <fieldset className="mt-4">
          <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Game Mode</legend>
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map(ranked => (
              <label key={String(ranked)} className={`flex min-h-12 cursor-pointer items-center rounded-lg border px-3 py-2 text-sm font-semibold ${
                (settings.ranked !== false) === ranked ? 'border-gold-500 bg-gold-500/10 text-gold-400' : 'border-ink-600 text-white'
              }`}>
                <input type="radio" name="game-mode" checked={(settings.ranked !== false) === ranked}
                  onChange={() => updateSettings({ ranked })} className="mr-2" />
                {ranked ? 'Ranked' : 'Unranked'}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">{settings.ranked !== false ? 'Updates Player Stats after each hand.' : 'Does not update Player Stats.'}</p>
        </fieldset>
        <button
          type="button"
          className="mt-4 min-h-12 w-full rounded-lg border border-gold-500/50 px-4 py-3 text-base font-semibold text-gold-400 hover:bg-gold-500/10"
          onClick={() => setShowStats(true)}
        >
          Player Stats
        </button>
      </section>

      <section className="setup-panel setup-players mb-6 rounded-xl border border-ink-700 bg-ink-900 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-500">
              Players ({players.length}/{settings.maxPlayers})
            </h2>
            {players.length > 1 && (
              <p className="mt-1 text-xs text-ink-500">Touch and hold a player, then drag to change seat order.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowSavedPlayers(true)}
            className="min-h-11 rounded-lg border border-gold-500/50 px-4 text-sm font-semibold text-gold-400 hover:bg-gold-500/10"
          >
            SAVED PLAYERS ({savedNames.length})
          </button>
        </div>

        <ul className="mb-4 divide-y divide-ink-700">
          {players
            .slice()
            .sort((a, b) => a.seat - b.seat)
            .map((p, i) => (
              <li
                key={p.id}
                {...getPlayerReorderProps(i)}
                className={`flex cursor-grab items-center justify-between rounded-lg px-2 py-2 select-none ${
                  draggedPlayerIndex === i ? 'bg-gold-500/10 ring-1 ring-inset ring-gold-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-felt-700 text-xs font-bold text-white">
                    {p.seat}
                  </span>
                  <span className="text-white">{p.name}</span>
                  <span className="text-sm text-ink-500">{formatChips(p.chips, settings)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    data-drag-handle
                    className="cursor-grab text-xl text-ink-500"
                    style={{ touchAction: 'none' }}
                    aria-hidden="true"
                  >
                    ☰
                  </span>
                  <button
                    onClick={() => removePlayerFromSetup(p.id)}
                    className="min-h-11 rounded-lg px-3 text-sm text-red-400 hover:bg-red-950 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          {players.length === 0 && (
            <li className="py-4 text-center text-sm text-ink-500">No players added yet.</li>
          )}
        </ul>

        {canAddMore && (
          <ProfileChoice value={profileId} onChange={(p:Profile|undefined)=>{setProfileId(p?.id || ''); if(p) setName(p.name);}} />
        )}
        {canAddMore && (
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              placeholder={`Player name (seat ${nextSeat})`}
              className="min-h-12 flex-1 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-white outline-none focus:border-gold-500"
            />
            <button
              onClick={handleAddPlayer}
              disabled={!name.trim()}
              className="min-h-12 rounded-lg bg-felt-700 px-5 py-2 font-medium text-white hover:bg-felt-600 disabled:opacity-40"
            >
              Add Player
            </button>
          </div>
        )}
      </section>
      </div>

      <div className="setup-actions flex justify-center">
        <button
          onClick={() => setSelectingDealer(true)}
          disabled={players.length < 2}
          className="min-h-12 rounded-xl bg-gold-500 px-10 py-3 text-lg font-bold text-ink-950 shadow-md transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Start Game
        </button>
      </div>
      {players.length < 2 && (
        <p className="mt-2 text-center text-xs text-ink-500">Add at least 2 players to start.</p>
      )}

      {showSavedPlayers && (
        <SavedPlayersModal
          names={savedNames}
          activeNames={players.filter(player=>player.profileId).map(player=>player.profileId!)}
          availableSeats={settings.maxPlayers - players.length}
          onAdd={(savedName) => addPlayerByName(savedName.name,nextSeat,savedName.id)}
          onAddAll={addAllSavedPlayers}
          onReorder={reorderSavedPlayers}
          onForget={forgetSavedPlayer}
          onClose={() => setShowSavedPlayers(false)}
        />
      )}
      {showStats && <PlayerStats onClose={()=>{setShowStats(false);setSavedNames(loadPlayerRoster());}} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="min-h-11 w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-white outline-none focus:border-gold-500"
    />
  );
}
