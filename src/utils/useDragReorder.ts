import { useRef, useState } from 'react';
import type { DragEvent, TouchEvent } from 'react';

const HOLD_TO_DRAG_MS = 160;
const SCROLL_THRESHOLD_PX = 8;

function isControl(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('button, input, select, textarea, a'));
}

export function useDragReorder(scope: string, onReorder: (fromIndex: number, toIndex: number) => void) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const currentIndex = useRef<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTouch = useRef<{ index: number; x: number; y: number } | null>(null);

  function cancelPendingTouch() {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    pendingTouch.current = null;
  }

  function finishDragging() {
    cancelPendingTouch();
    currentIndex.current = null;
    setDraggedIndex(null);
  }

  function moveTo(toIndex: number) {
    const fromIndex = currentIndex.current;
    if (fromIndex === null || fromIndex === toIndex) return;
    onReorder(fromIndex, toIndex);
    currentIndex.current = toIndex;
    setDraggedIndex(toIndex);
  }

  function startMouseDrag(index: number, event: DragEvent<HTMLElement>) {
    if (isControl(event.target)) {
      event.preventDefault();
      return;
    }
    currentIndex.current = index;
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }

  function startTouchDrag(index: number, event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1) return;
    const grabbedHandle = event.target instanceof Element && event.target.closest('[data-drag-handle]');
    if (grabbedHandle) {
      event.preventDefault();
      currentIndex.current = index;
      setDraggedIndex(index);
      return;
    }
    if (isControl(event.target)) return;
    const touch = event.touches[0];
    pendingTouch.current = { index, x: touch.clientX, y: touch.clientY };
    holdTimer.current = setTimeout(() => {
      currentIndex.current = index;
      setDraggedIndex(index);
      holdTimer.current = null;
    }, HOLD_TO_DRAG_MS);
  }

  function moveTouch(event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];

    if (currentIndex.current === null) {
      const pending = pendingTouch.current;
      if (
        pending &&
        (Math.abs(touch.clientX - pending.x) > SCROLL_THRESHOLD_PX ||
          Math.abs(touch.clientY - pending.y) > SCROLL_THRESHOLD_PX)
      ) {
        cancelPendingTouch();
      }
      return;
    }

    event.preventDefault();
    const target = document
      .elementFromPoint(touch.clientX, touch.clientY)
      ?.closest<HTMLElement>(`[data-reorder-scope="${scope}"]`);
    const targetIndex = Number(target?.dataset.reorderIndex);
    if (Number.isInteger(targetIndex)) moveTo(targetIndex);
  }

  function getReorderProps(index: number) {
    return {
      draggable: true,
      'data-reorder-index': index,
      'data-reorder-scope': scope,
      onDragStart: (event: DragEvent<HTMLElement>) => startMouseDrag(index, event),
      onDragEnter: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        moveTo(index);
      },
      onDragOver: (event: DragEvent<HTMLElement>) => event.preventDefault(),
      onDragEnd: finishDragging,
      onTouchStart: (event: TouchEvent<HTMLElement>) => startTouchDrag(index, event),
      onTouchMove: moveTouch,
      onTouchEnd: finishDragging,
      onTouchCancel: finishDragging,
    };
  }

  return { draggedIndex, getReorderProps };
}
