import type { ReactNode } from 'react';
import { useAndroidBack } from '../../utils/androidBack';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  contentClassName?: string;
  alignTop?: boolean;
}

export default function Modal({
  title,
  onClose,
  children,
  width = 'max-w-md',
  contentClassName = 'overflow-y-auto',
  alignTop = false,
}: ModalProps) {
  useAndroidBack(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 animate-slide-in"
      onClick={onClose}
    >
      <div
        className={`${alignTop ? 'my-4 self-start' : 'my-auto'} max-h-[calc(100vh-2rem)] w-full ${contentClassName} ${width} rounded-xl border border-ink-600 bg-ink-800 p-5 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex flex-none items-center justify-between">
          <h2 className="text-lg font-semibold text-gold-400">{title}</h2>
          <button
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-500 hover:bg-ink-700 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
