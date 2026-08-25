import type { GameSettings, Pot } from '../../types/poker';
import { formatChips } from '../../utils/format';
import { totalPotAmount } from '../../gameEngine/potManager';

interface PotDisplayProps {
  pots: Pot[];
  settings: GameSettings;
}

export default function PotDisplay({ pots, settings }: PotDisplayProps) {
  const total = totalPotAmount(pots);

  return (
    <div className="flex flex-col items-center gap-1 animate-chip-pop" key={total}>
      <div className="rounded-2xl border border-gold-600/40 bg-ink-950/70 px-6 py-3 text-center shadow-inner">
        <p className="text-[10px] uppercase tracking-[0.25em] text-gold-500">Pot</p>
        <p className="text-2xl font-bold text-white sm:text-3xl">{formatChips(total, settings)}</p>
      </div>
      {pots.length > 1 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {pots.map((pot, i) => (
            <span
              key={pot.id}
              className="rounded-full border border-ink-600 bg-ink-900/80 px-2 py-0.5 text-[10px] text-ink-500"
            >
              {i === 0 ? 'Main' : `Side ${i}`}: {formatChips(pot.amount, settings)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
