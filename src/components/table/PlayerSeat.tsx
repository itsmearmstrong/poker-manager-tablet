import type { GameSettings, Player } from '../../types/poker';
import { formatChips } from '../../utils/format';

interface PlayerSeatProps {
  player: Player;
  settings: GameSettings;
  isCurrentTurn: boolean;
}

export default function PlayerSeat({ player, settings, isCurrentTurn }: PlayerSeatProps) {
  const isOut = player.status === 'out';
  const isFolded = player.folded;
  const dimmed = isOut || isFolded;

  return (
    <div
      className={`w-36 sm:w-40 rounded-xl border-2 bg-ink-900/95 px-3 py-2 shadow-lg backdrop-blur transition-all ${
        isCurrentTurn
          ? 'border-gold-500 animate-pulse-turn'
          : dimmed
            ? 'border-ink-700'
            : 'border-ink-600'
      } ${isFolded ? 'animate-fold-out' : ''}`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-500">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ink-700 text-[9px] text-white">
            {player.seat}
          </span>
          SEAT {player.seat}
        </span>
        <div className="flex gap-1">
          {player.isDealer && <Badge label="D" title="Dealer" color="bg-white text-ink-950" />}
          {player.isSmallBlind && <Badge label="SB" title="Small Blind" color="bg-felt-600 text-white" />}
          {player.isBigBlind && <Badge label="BB" title="Big Blind" color="bg-felt-700 text-white" />}
        </div>
      </div>

      <p className={`truncate text-sm font-semibold ${isOut ? 'text-ink-500 line-through' : 'text-white'}`}>
        {player.name}
      </p>
      <p className="text-xs text-ink-500">
        Chips: <span className="font-medium text-gold-400">{formatChips(player.chips, settings)}</span>
      </p>

      {player.currentBet > 0 && !isOut && (
        <p className="mt-0.5 text-xs text-white">
          Bet: <span className="font-semibold text-gold-500">{formatChips(player.currentBet, settings)}</span>
        </p>
      )}

      <div className="mt-1 flex flex-wrap gap-1">
        {isCurrentTurn && !isOut && (
          <span className="rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-ink-950">
            YOUR TURN
          </span>
        )}
        {player.allIn && !isOut && (
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">ALL-IN</span>
        )}
        {isFolded && !isOut && (
          <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">FOLDED</span>
        )}
        {isOut && (
          <span className="rounded bg-red-950 px-1.5 py-0.5 text-[10px] font-bold text-red-400">OUT</span>
        )}
        {player.sittingOut && !isOut && (
          <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">SITTING OUT</span>
        )}
      </div>
    </div>
  );
}

function Badge({ label, title, color }: { label: string; title: string; color: string }) {
  return (
    <span
      title={title}
      className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${color}`}
    >
      {label}
    </span>
  );
}
