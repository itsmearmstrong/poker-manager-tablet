import { useGameStore } from '../../store/gameStore';
import { formatChips } from '../../utils/format';
import { useState } from 'react';
import PlayerStats from '../stats/PlayerStats';

export default function EndedScreen() {
  const game = useGameStore((s) => s.game);
  const newGame = useGameStore((s) => s.newGame);
  const [stats,setStats]=useState(false);
  if (!game) return null;

  const rows = [...game.players]
    .filter((p) => !p.removed)
    .map((p) => ({ ...p, profitLoss: p.chips - (p.initialBuyIn + p.totalRebuyAmount) }))
    .sort((a, b) => b.profitLoss - a.profitLoss);

  return (
    <div className="ended-screen mx-auto h-full max-w-lg overflow-y-auto px-4 py-10 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-500">Game Over</p>
      <h1 className="mt-1 text-3xl font-bold text-white">{game.gameName}</h1>
      <p className="mt-1 text-sm text-ink-500">{game.handHistory.length} completed hands</p>
      <button className="stats-button" onClick={()=>setStats(true)}>Player Stats</button>
      {stats&&<PlayerStats onClose={()=>setStats(false)} />}

      <div className="mt-6 space-y-2">
        {rows.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-900 px-4 py-2.5"
          >
            <span className="text-white">
              {i === 0 && '🏆 '}
              {p.name}
            </span>
            <span className={`font-bold ${p.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {p.profitLoss >= 0 ? '+' : ''}
              {formatChips(p.profitLoss, game.settings)}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={newGame}
        className="mt-8 min-h-12 rounded-xl bg-gold-500 px-8 py-3 font-bold text-ink-950 hover:bg-gold-400"
      >
        New Game
      </button>
    </div>
  );
}
