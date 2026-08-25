import { create } from 'zustand';
import type { ActionType, GameSettings, GameState } from '../types/poker';
import { createDefaultSettings, createInitialGameState, createPlayer } from '../gameEngine/gameFactory';
import { applyAction } from '../gameEngine/bettingEngine';
import {
  advanceRound,
  awardPots,
  awardUncontestedPot,
  finalizeHand,
  getHandOutcome,
  restartHand,
  startNewHand,
} from '../gameEngine/handManager';
import {
  addPlayer as addPlayerEngine,
  addRebuy as addRebuyEngine,
  adjustPlayerChips as adjustPlayerChipsEngine,
  changeBlinds as changeBlindsEngine,
  endGame as endGameEngine,
  movePlayerSeat as movePlayerSeatEngine,
  removePlayer as removePlayerEngine,
  setPaused as setPausedEngine,
  swapPlayerSeats as swapPlayerSeatsEngine,
  toggleSitOut as toggleSitOutEngine,
} from '../gameEngine/hostActions';
import { getContestants, getNextActableSeat, isBettingRoundComplete } from '../gameEngine/turnManager';
import { clearSavedGame, loadGame, saveGame } from './persistence';

const UNDO_LIMIT = 30;

interface GameStore {
  game: GameState | null;
  undoStack: GameState[];
  savedGameAvailable: GameState | null;

  // Setup
  beginSetup: (settings?: Partial<GameSettings>) => void;
  updateSettings: (patch: Partial<GameSettings>) => void;
  addPlayer: (name: string, seat: number, startingChips?: number) => void;
  removePlayerFromSetup: (playerId: string) => void;
  movePlayerSeat: (playerId: string, direction: 'up' | 'down') => void;
  swapPlayerSeats: (playerIdA: string, playerIdB: string) => void;
  startGame: () => void;

  // In-hand actions
  playerAction: (playerId: string, type: ActionType, amount?: number) => void;
  advanceToNextRound: () => void;
  confirmShowdown: (winnersByPotId: Record<string, string[]>) => void;
  startNextHand: () => void;
  restartCurrentHand: () => void;
  undo: () => void;
  canUndo: () => boolean;

  // Host controls
  adjustPlayerChips: (playerId: string, delta: number) => void;
  addRebuy: (playerId: string, amount: number) => void;
  toggleSitOut: (playerId: string) => void;
  removePlayer: (playerId: string) => void;
  changeBlinds: (small: number, big: number, ante: number) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;

  // Persistence
  resumeSavedGame: () => void;
  discardSavedGame: () => void;
  newGame: () => void;
}

function resolveOutcome(state: GameState): GameState {
  const outcome = getHandOutcome(state);
  if (outcome === 'uncontested') {
    const winner = getContestants(state)[0];
    if (!winner) return state;
    let next = awardUncontestedPot(state, winner.id);
    next = finalizeHand(next);
    next.currentPlayerSeat = null;
    return next;
  }
  return state;
}

export const useGameStore = create<GameStore>((set, get) => {
  const initialSaved = loadGame();

  function commit(next: GameState, opts: { pushUndoFrom?: GameState; clearUndo?: boolean } = {}) {
    set((s) => ({
      game: next,
      undoStack: opts.clearUndo
        ? []
        : opts.pushUndoFrom
          ? [...s.undoStack, opts.pushUndoFrom].slice(-UNDO_LIMIT)
          : s.undoStack,
    }));
    saveGame(next);
  }

  return {
    game: null,
    undoStack: [],
    savedGameAvailable: initialSaved && initialSaved.status !== 'ended' ? initialSaved : null,

    beginSetup: (settings) => {
      const base = createInitialGameState({ ...createDefaultSettings(), ...settings });
      set({ game: base, undoStack: [] });
      saveGame(base);
    },

    updateSettings: (patch) => {
      const state = get().game;
      if (!state || state.status !== 'setup') return;
      const settings = { ...state.settings, ...patch };
      const next: GameState = {
        ...state,
        settings,
        gameName: settings.gameName,
        blinds: { small: settings.smallBlind, big: settings.bigBlind, ante: settings.ante },
        minRaiseAmount: settings.bigBlind,
        updatedAt: Date.now(),
      };
      commit(next);
    },

    addPlayer: (name, seat, startingChips) => {
      const state = get().game;
      if (!state) return;
      const chips = startingChips ?? state.settings.startingStack;
      const next = addPlayerEngine(state, name, seat, chips);
      commit(next);
    },

    removePlayerFromSetup: (playerId) => {
      const state = get().game;
      if (!state) return;
      const next = removePlayerEngine(state, playerId);
      commit(next);
    },

    movePlayerSeat: (playerId, direction) => {
      const state = get().game;
      if (!state) return;
      const next = movePlayerSeatEngine(state, playerId, direction);
      commit(next);
    },

    swapPlayerSeats: (playerIdA, playerIdB) => {
      const state = get().game;
      if (!state) return;
      const next = swapPlayerSeatsEngine(state, playerIdA, playerIdB);
      commit(next);
    },

    startGame: () => {
      const state = get().game;
      if (!state || state.players.length < 2) return;
      const next = startNewHand(state);
      commit(next, { clearUndo: true });
    },

    playerAction: (playerId, type, amount) => {
      const state = get().game;
      if (!state) return;
      const actor = state.players.find((p) => p.id === playerId);
      if (!actor) return;

      let next = applyAction(state, playerId, type, amount);

      const outcome = getHandOutcome(next);
      if (outcome === 'uncontested') {
        next = resolveOutcome(next);
      } else if (isBettingRoundComplete(next)) {
        next.currentPlayerSeat = null;
      } else {
        next.currentPlayerSeat = getNextActableSeat(next, actor.seat);
      }

      commit(next, { pushUndoFrom: state, clearUndo: outcome === 'uncontested' });
    },

    advanceToNextRound: () => {
      const state = get().game;
      if (!state) return;
      let next = advanceRound(state);
      const outcome = getHandOutcome(next);
      if (outcome === 'uncontested') next = resolveOutcome(next);
      commit(next, { pushUndoFrom: state, clearUndo: outcome === 'uncontested' });
    },

    confirmShowdown: (winnersByPotId) => {
      const state = get().game;
      if (!state) return;
      let next = awardPots(state, winnersByPotId);
      next = finalizeHand(next);
      commit(next, { clearUndo: true });
    },

    startNextHand: () => {
      const state = get().game;
      if (!state) return;
      const next = startNewHand(state);
      commit(next, { pushUndoFrom: state });
    },

    restartCurrentHand: () => {
      const state = get().game;
      if (!state) return;
      const next = restartHand(state);
      commit(next, { pushUndoFrom: state });
    },

    undo: () => {
      const stack = get().undoStack;
      if (stack.length === 0) return;
      const prev = stack[stack.length - 1];
      set({ game: prev, undoStack: stack.slice(0, -1) });
      saveGame(prev);
    },

    canUndo: () => get().undoStack.length > 0,

    adjustPlayerChips: (playerId, delta) => {
      const state = get().game;
      if (!state) return;
      const next = adjustPlayerChipsEngine(state, playerId, delta);
      commit(next, { pushUndoFrom: state });
    },

    addRebuy: (playerId, amount) => {
      const state = get().game;
      if (!state) return;
      const next = addRebuyEngine(state, playerId, amount);
      commit(next, { pushUndoFrom: state });
    },

    toggleSitOut: (playerId) => {
      const state = get().game;
      if (!state) return;
      const next = toggleSitOutEngine(state, playerId);
      commit(next);
    },

    removePlayer: (playerId) => {
      const state = get().game;
      if (!state) return;
      const next = removePlayerEngine(state, playerId);
      commit(next, { pushUndoFrom: state });
    },

    changeBlinds: (small, big, ante) => {
      const state = get().game;
      if (!state) return;
      const next = changeBlindsEngine(state, small, big, ante);
      commit(next);
    },

    pauseGame: () => {
      const state = get().game;
      if (!state) return;
      commit(setPausedEngine(state, true));
    },

    resumeGame: () => {
      const state = get().game;
      if (!state) return;
      commit(setPausedEngine(state, false));
    },

    endGame: () => {
      const state = get().game;
      if (!state) return;
      commit(endGameEngine(state), { clearUndo: true });
    },

    resumeSavedGame: () => {
      const saved = get().savedGameAvailable;
      if (!saved) return;
      set({ game: saved, savedGameAvailable: null, undoStack: [] });
    },

    discardSavedGame: () => {
      clearSavedGame();
      set({ savedGameAvailable: null });
    },

    newGame: () => {
      clearSavedGame();
      set({ game: null, undoStack: [], savedGameAvailable: null });
    },
  };
});

export { createPlayer };
