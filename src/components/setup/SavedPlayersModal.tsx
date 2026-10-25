import Modal from '../common/Modal';
import type { Profile } from '../../types/stats';
import { useDragReorder } from '../../utils/useDragReorder';

interface SavedPlayersModalProps {
  names: Profile[];
  activeNames: string[];
  availableSeats: number;
  onAdd: (name: Profile) => void;
  onAddAll: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onForget: (index: number) => void;
  onClose: () => void;
}

export default function SavedPlayersModal({
  names,
  activeNames,
  availableSeats,
  onAdd,
  onAddAll,
  onReorder,
  onForget,
  onClose,
}: SavedPlayersModalProps) {
  const { draggedIndex, getReorderProps } = useDragReorder('saved-players', onReorder);
  const active = new Set(activeNames);
  const availableNames = names.filter((name) => !active.has(name.id));

  return (
    <Modal
      title="Saved Players"
      onClose={onClose}
      width="max-w-2xl"
      contentClassName="flex flex-col overflow-hidden"
    >
      <p className="mb-3 flex-none text-sm text-ink-500">
        Tap Add for tonight&apos;s game. Touch and hold a name, then drag it into your usual table order.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-ink-700">
        {names.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-500">
            Names entered on the setup screen will be saved here automatically.
          </p>
        ) : (
          <ul className="divide-y divide-ink-700">
            {names.map((name, index) => {
              const isActive = active.has(name.id);
              return (
                <li
                  key={name.id}
                  {...getReorderProps(index)}
                  className={`flex min-h-16 cursor-grab items-center px-3 py-2 select-none ${
                    draggedIndex === index ? 'bg-gold-500/10 ring-1 ring-inset ring-gold-500' : ''
                  }`}
                >
                  <span className="mr-3 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ink-700 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base font-semibold text-white">{name.name}</span>

                  <div className="ml-3 flex flex-none items-center">
                    <span
                      data-drag-handle
                      className="mr-2 cursor-grab text-xl text-ink-500"
                      style={{ touchAction: 'none' }}
                      aria-hidden="true"
                    >
                      ☰
                    </span>
                    <button
                      type="button"
                      onClick={() => onForget(index)}
                      className="ml-2 min-h-11 rounded-lg px-3 text-sm text-red-400 hover:bg-red-950 hover:text-red-300"
                    >
                      Forget
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdd(name)}
                      disabled={isActive || availableSeats === 0}
                      className="ml-2 min-h-11 min-w-24 rounded-lg bg-felt-700 px-4 font-semibold text-white hover:bg-felt-600 disabled:bg-ink-700 disabled:text-ink-500"
                    >
                      {isActive ? 'Added' : 'Add'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-none justify-end">
        <button
          type="button"
          onClick={onAddAll}
          disabled={availableNames.length === 0 || availableSeats === 0}
          className="min-h-12 rounded-xl bg-gold-500 px-7 font-bold text-ink-950 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ADD AVAILABLE PLAYERS
        </button>
      </div>
    </Modal>
  );
}
