import { useRef, useState } from 'react';
import type { GameState } from '../../types/poker';
import { getSeatPosition } from '../../utils/seatLayout';
import { useGameStore } from '../../store/gameStore';
import PlayerSeat from './PlayerSeat';
import PotDisplay from './PotDisplay';
import BoardCards from './BoardCards';

interface PokerTableProps {
  game: GameState;
  onOpenPlayer: (playerId: string) => void;
}

export default function PokerTable({ game, onOpenPlayer }: PokerTableProps) {
  const swapPlayerSeats = useGameStore((s) => s.swapPlayerSeats);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const touchDrag = useRef<{
    playerId: string;
    x: number;
    y: number;
    moved: boolean;
    targetId: string | null;
  } | null>(null);
  const suppressClick = useRef(false);

  // Retain departed players in accounting, but not in the visual seating ring.
  // Older saves represented removal with out + sittingOut, without a separate flag.
  const seatedPlayers = game.players.filter(p => !p.removed && !(p.removed === undefined && p.status === 'out' && p.sittingOut)).sort((a, b) => a.seat - b.seat);
  const canReseat = game.status === 'hand_complete';
  const dense = seatedPlayers.length > 9;

  return (
    <div className={`poker-table ${dense ? 'poker-table-dense' : ''} relative mx-auto aspect-[16/10] w-full max-w-4xl`}>
      <div className="absolute inset-[10%] rounded-[50%] border-[6px] border-felt-950 bg-felt-700 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-3 rounded-[50%] border border-gold-600/20" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <BoardCards round={game.currentRound} />
          <PotDisplay pots={game.pots} settings={game.settings} />
        </div>
      </div>

      {seatedPlayers.map((player, i) => {
        const pos = getSeatPosition(
          i,
          seatedPlayers.length,
          seatedPlayers.length >= 8 ? 42 : 46,
          seatedPlayers.length >= 8 ? 40 : 42,
          dense ? 180 / seatedPlayers.length : 0,
        );
        return (
          <div
            key={player.id}
            data-player-id={player.id}
            draggable={canReseat}
            role="button"
            tabIndex={0}
            aria-label={`Manage ${player.name}`}
            onClick={() => {
              if (suppressClick.current) return;
              onOpenPlayer(player.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenPlayer(player.id);
              }
            }}
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
            onTouchStart={(event) => {
              if (!canReseat || event.touches.length !== 1) return;
              const touch = event.touches[0];
              touchDrag.current = {
                playerId: player.id,
                x: touch.clientX,
                y: touch.clientY,
                moved: false,
                targetId: null,
              };
            }}
            onTouchMove={(event) => {
              const pending = touchDrag.current;
              if (!canReseat || !pending || event.touches.length !== 1) return;
              const touch = event.touches[0];
              if (!pending.moved && Math.hypot(touch.clientX - pending.x, touch.clientY - pending.y) < 10) return;
              pending.moved = true;
              event.preventDefault();
              setDraggedId(pending.playerId);
              const target = document.elementFromPoint(touch.clientX, touch.clientY)?.closest<HTMLElement>('[data-player-id]');
              const targetId = target?.dataset.playerId ?? null;
              pending.targetId = targetId && targetId !== pending.playerId ? targetId : null;
              setDragOverId(pending.targetId);
            }}
            onTouchEnd={() => {
              const pending = touchDrag.current;
              if (pending?.moved) {
                if (pending.targetId) swapPlayerSeats(pending.playerId, pending.targetId);
                suppressClick.current = true;
                window.setTimeout(() => {
                  suppressClick.current = false;
                }, 0);
              }
              touchDrag.current = null;
              setDraggedId(null);
              setDragOverId(null);
            }}
            onTouchCancel={() => {
              touchDrag.current = null;
              setDraggedId(null);
              setDragOverId(null);
            }}
            className={`absolute rounded-xl transition-transform duration-150 ${
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
              isWaitingForNextHand={
                (game.status === 'in_progress' || game.status === 'paused') &&
                player.status === 'active' &&
                !player.inHand
              }
            />
          </div>
        );
      })}
    </div>
  );
}
