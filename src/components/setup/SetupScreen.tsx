import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { formatChips } from '../../utils/format';

export default function SetupScreen() {
  const game = useGameStore((s) => s.game);
  const beginSetup = useGameStore((s) => s.beginSetup);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const addPlayer = useGameStore((s) => s.addPlayer);
  const removePlayerFromSetup = useGameStore((s) => s.removePlayerFromSetup);
  const movePlayerSeat = useGameStore((s) => s.movePlayerSeat);
  const startGame = useGameStore((s) => s.startGame);

  const [name, setName] = useState('');

  useEffect(() => {
    if (!game) beginSetup();
  }, [game, beginSetup]);

  if (!game) return null;
  const { settings, players } = game;

  const nextSeat = (() => {
    const taken = new Set(players.map((p) => p.seat));
    for (let s = 1; s <= settings.maxPlayers; s++) if (!taken.has(s)) return s;
    return null;
  })();

  const canAddMore = players.length < settings.maxPlayers;

  function handleAddPlayer() {
    if (!name.trim() || nextSeat === null) return;
    addPlayer(name.trim(), nextSeat, settings.startingStack);
    setName('');
  }

  return (
    <div className="mx-auto min-h-full max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-gold-500">Poker Table Manager</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Game Setup</h1>
      </div>

      <section className="mb-6 rounded-xl border border-ink-700 bg-ink-900 p-5">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">
          Game Name
        </label>
        <input
          value={settings.gameName}
          onChange={(e) => updateSettings({ gameName: e.target.value })}
          placeholder="Friday Poker Night"
          className="w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-white outline-none focus:border-gold-500"
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
              onChange={(v) => updateSettings({ maxPlayers: Math.max(players.length, Math.min(10, v)) })}
              max={10}
              min={2}
            />
          </Field>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-ink-700 bg-ink-900 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-500">
            Players ({players.length}/{settings.maxPlayers})
          </h2>
        </div>

        <ul className="mb-4 divide-y divide-ink-700">
          {players
            .slice()
            .sort((a, b) => a.seat - b.seat)
            .map((p, i, sorted) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-felt-700 text-xs font-bold text-white">
                    {p.seat}
                  </span>
                  <span className="text-white">{p.name}</span>
                  <span className="text-sm text-ink-500">{formatChips(p.chips, settings)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => movePlayerSeat(p.id, 'up')}
                      disabled={i === 0}
                      aria-label={`Move ${p.name} up`}
                      className="flex h-5 w-5 items-center justify-center rounded text-ink-500 hover:bg-ink-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => movePlayerSeat(p.id, 'down')}
                      disabled={i === sorted.length - 1}
                      aria-label={`Move ${p.name} down`}
                      className="flex h-5 w-5 items-center justify-center rounded text-ink-500 hover:bg-ink-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    onClick={() => removePlayerFromSetup(p.id)}
                    className="text-sm text-red-400 hover:text-red-300"
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
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              placeholder={`Player name (seat ${nextSeat})`}
              className="flex-1 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-white outline-none focus:border-gold-500"
            />
            <button
              onClick={handleAddPlayer}
              disabled={!name.trim()}
              className="rounded-lg bg-felt-700 px-4 py-2 font-medium text-white hover:bg-felt-600 disabled:opacity-40"
            >
              Add Player
            </button>
          </div>
        )}
      </section>

      <div className="flex justify-center">
        <button
          onClick={startGame}
          disabled={players.length < 2}
          className="rounded-xl bg-gold-500 px-10 py-3 text-lg font-bold text-ink-950 shadow-lg shadow-gold-500/20 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Start Game
        </button>
      </div>
      {players.length < 2 && (
        <p className="mt-2 text-center text-xs text-ink-500">Add at least 2 players to start.</p>
      )}
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
      className="w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-white outline-none focus:border-gold-500"
    />
  );
}
