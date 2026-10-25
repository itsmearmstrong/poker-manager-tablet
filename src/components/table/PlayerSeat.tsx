import type { GameSettings, Player } from '../../types/poker';
import { formatChips } from '../../utils/format';

interface PlayerSeatProps {
  player: Player;
  settings: GameSettings;
  isCurrentTurn: boolean;
  isWaitingForNextHand?: boolean;
}

export default function PlayerSeat({
  player,
  settings,
  isCurrentTurn,
  isWaitingForNextHand = false,
}: PlayerSeatProps) {
  const isOut = player.status === 'out';
  const isFolded = player.folded;
  const dimmed = isOut || isFolded;

  return (
    <div
      className={`player-seat w-36 sm:w-40 rounded-xl border-2 bg-ink-900 px-3 py-2 shadow-md transition-colors duration-150 ${
        isCurrentTurn
          ? 'border-gold-500 animate-pulse-turn'
          : dimmed
            ? 'border-ink-700'
            : 'border-ink-600'
      } ${isFolded ? 'animate-fold-out' : ''}`}
    >
      <div className="mb-1 flex min-w-0 items-center justify-between">
        <div className="flex min-w-0 items-center">
          <span className="mr-1.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-ink-700 text-[10px] font-semibold text-white">
            {player.seat}
          </span>
          <p className={`truncate text-sm font-semibold ${isOut ? 'text-ink-500 line-through' : 'text-white'}`}>
            {player.name}
          </p>
        </div>
        <div className="ml-1 flex flex-none">
          {player.isDealer && <Badge label="D" title="Dealer" color="bg-white text-ink-950" />}
          {player.isSmallBlind && <Badge label="SB" title="Small Blind" color="bg-felt-600 text-white" />}
          {player.isBigBlind && <Badge label="BB" title="Big Blind" color="bg-felt-700 text-white" />}
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-between whitespace-nowrap text-xs">
        <p className="font-semibold text-gold-400" title="Chips">
          {formatChips(player.chips, settings)}
        </p>
        {isOut ? (
          <StatusBadge label="OUT" color="bg-red-950 text-red-400" />
        ) : isFolded ? (
          <StatusBadge label="FOLDED" color="bg-ink-700 text-ink-500" />
        ) : player.allIn ? (
          <StatusBadge label="ALL-IN" color="bg-red-600 text-white" />
        ) : player.sittingOut ? (
          <StatusBadge label="SIT OUT" color="bg-ink-700 text-ink-500" />
        ) : isWaitingForNextHand ? (
          <StatusBadge label="NEXT HAND" color="bg-gold-500/15 text-gold-400" />
        ) : player.currentBet > 0 ? (
          <p className="ml-2 text-[10px] font-semibold text-ink-500">
            BET <span className="text-gold-500">{formatChips(player.currentBet, settings)}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Badge({ label, title, color }: { label: string; title: string; color: string }) {
  return (
    <span
      title={title}
      className={`ml-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${color}`}
    >
      {label}
    </span>
  );
}

function StatusBadge({ label, title, color }: { label: string; title?: string; color: string }) {
  return (
    <span title={title} className={`ml-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${color}`}>
      {label}
    </span>
  );
}
