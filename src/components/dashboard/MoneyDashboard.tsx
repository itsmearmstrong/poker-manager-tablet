import type { GameState } from '../../types/poker';
import { formatChips } from '../../utils/format';
import Modal from '../common/Modal';

interface MoneyDashboardProps {
  game: GameState;
  onClose: () => void;
}

export default function MoneyDashboard({ game, onClose }: MoneyDashboardProps) {
  const rows = [...game.players]
    .sort((a, b) => a.seat - b.seat)
    .map((p) => {
      const totalBuyIn = p.initialBuyIn + p.totalRebuyAmount;
      const profitLoss = p.chips - totalBuyIn;
      return { ...p, totalBuyIn, profitLoss };
    });

  return (
    <Modal title="Money Tracking" onClose={onClose} width="max-w-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="py-2 pr-3">Player</th>
              <th className="py-2 pr-3">Buy-in</th>
              <th className="py-2 pr-3">Rebuys</th>
              <th className="py-2 pr-3">Stack</th>
              <th className="py-2">Profit/Loss</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-ink-800">
                <td className="py-2 pr-3 text-white">
                  {p.name}
                  {p.status === 'out' && <span className="ml-1 text-xs text-red-400">(OUT)</span>}
                </td>
                <td className="py-2 pr-3 text-ink-500">{formatChips(p.initialBuyIn, game.settings)}</td>
                <td className="py-2 pr-3 text-ink-500">
                  {p.totalRebuys > 0 ? formatChips(p.totalRebuyAmount, game.settings) : '—'}
                </td>
                <td className="py-2 pr-3 font-medium text-white">{formatChips(p.chips, game.settings)}</td>
                <td className={`py-2 font-semibold ${p.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {p.profitLoss >= 0 ? '+' : ''}
                  {formatChips(p.profitLoss, game.settings)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
