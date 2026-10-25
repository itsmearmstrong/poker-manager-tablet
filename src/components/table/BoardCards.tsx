import type { Round } from '../../types/poker';

interface BoardCardsProps {
  round: Round;
}

// The app never tracks real card values (see types/poker.ts) — this is a purely
// cosmetic "cards opening" cue so the host can see a new street was dealt.
const CARD_COUNT: Record<Round, number> = {
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
  showdown: 5,
};

export default function BoardCards({ round }: BoardCardsProps) {
  const count = CARD_COUNT[round];
  const label = round === 'preflop' ? 'PRE-FLOP' : round.toUpperCase();

  return (
    <div className="flex flex-col items-center pb-2 [perspective:600px]">
      <p className="mb-2 text-sm font-bold tracking-[0.2em] text-gold-400">{label}</p>
      {count > 0 && (
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              className="animate-card-deal h-11 w-8 rounded-md border border-gold-600/40 bg-gradient-to-br from-ink-700 to-ink-900 shadow-md sm:h-14 sm:w-10"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="m-1 h-[calc(100%-0.5rem)] rounded-sm border border-gold-500/20 bg-[repeating-linear-gradient(135deg,rgba(232,189,78,0.08)_0px,rgba(232,189,78,0.08)_2px,transparent_2px,transparent_6px)]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
