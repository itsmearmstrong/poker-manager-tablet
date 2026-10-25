import { useEffect, useRef } from 'react';

type BackHandler = () => void;

const handlers: BackHandler[] = [];

declare global {
  interface Window {
    __pokerManagerHandleBack?: () => boolean;
  }
}

export function installAndroidBackHandler(): void {
  window.__pokerManagerHandleBack = () => {
    const handler = handlers[handlers.length - 1];
    if (!handler) return false;
    handler();
    return true;
  };
}

export function useAndroidBack(handler: BackHandler): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const registeredHandler = () => handlerRef.current();
    handlers.push(registeredHandler);

    return () => {
      const index = handlers.lastIndexOf(registeredHandler);
      if (index >= 0) handlers.splice(index, 1);
    };
  }, []);
}
