import { useState } from 'react';
import type { GameState } from '../../types/poker';
import { getSeatPosition } from '../../utils/seatLayout';
import { useGameStore } from '../../store/gameStore';
import PlayerSeat from './PlayerSeat';
import PotDisplay from './PotDisplay';

interface PokerTableProps {
  game: GameState;
}

export default function PokerTable({ game }: PokerTableProps) {
  const swapPlayerSeats = useGameStore((s) => s.swapPlayerSeats);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const seatedPlayers = [...game.players].sort((a, b) => a.seat - b.seat);
  const canReseat = game.status === 'hand_complete';

  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-4xl">
      <div className="absolute inset-[10%] rounded-[50%] border-[6px] border-felt-950 bg-gradient-to-br from-felt-800 via-felt-700 to-felt-900 shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_0_60px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-3 rounded-[50%] border border-gold-600/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <PotDisplay pots={game.pots} settings={game.settings} />
        </div>
      </div>

      {seatedPlayers.map((player, i) => {
        const pos = getSeatPosition(i, seatedPlayers.length);
        return (
          <div
            key={player.id}
            draggable={canReseat}
            onDragStart={(e) => {
              setDraggedId(player.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => {
              setDraggedId(null);
              setDragOverId(null);
            }}
            onDragOver={(e) => {
              if (!canReseat || !draggedId || draggedId === player.id) return;
              e.preventDefault();
            }}
            onDragEnter={() => {
              if (!canReseat || !draggedId || draggedId === player.id) return;
              setDragOverId(player.id);
            }}
            onDragLeave={() => setDragOverId((id) => (id === player.id ? null : id))}
            onDrop={(e) => {
              e.preventDefault();
              if (canReseat && draggedId && draggedId !== player.id) swapPlayerSeats(draggedId, player.id);
              setDraggedId(null);
              setDragOverId(null);
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl transition-transform ${
              canReseat ? 'cursor-grab active:cursor-grabbing' : ''
            } ${draggedId === player.id ? 'opacity-40' : ''} ${
              dragOverId === player.id ? 'scale-105 ring-2 ring-gold-500' : ''
            }`}
            style={{ left: pos.left, top: pos.top }}
          >
            <PlayerSeat
              player={player}
              settings={game.settings}
              isCurrentTurn={game.currentPlayerSeat === player.seat}
            />
          </div>
        );
      })}
    </div>
  );
}
