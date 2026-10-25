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
  undoFinalizedHand,
} from '../gameEngine/handManager';
import {
  addPlayer as addPlayerEngine,
  addRebuy as addRebuyEngine,
  adjustPlayerChips as adjustPlayerChipsEngine,
  changeBlinds as changeBlindsEngine,
  endGame as endGameEngine,
  movePlayerSeat as movePlayerSeatEngine,
  removePlayer as removePlayerEngine,
  renamePlayer as renamePlayerEngine,
  setPaused as setPausedEngine,
  swapPlayerSeats as swapPlayerSeatsEngine,
  toggleSitOut as toggleSitOutEngine,
} from '../gameEngine/hostActions';
import { getContestants, getNextActableSeat, isBettingRoundComplete } from '../gameEngine/turnManager';
import { getLegalActions } from '../gameEngine/validation';
import { clearSavedGame, loadGame, loadUndo, saveGame, useStorageStatus } from './persistence';
import { createProfile, loadProfiles } from './profiles';

const UNDO_LIMIT = 30;

const FORCED_ACTIONS: ActionType[] = ['post_ante', 'post_small_blind', 'post_big_blind'];

/** Replays the current hand to recover undo checkpoints after Android restarts the WebView. */
function rebuildHandUndoStack(state: GameState): GameState[] {
  if (state.status !== 'in_progress' && state.status !== 'paused') return [];

  const playerActions = state.actionHistory.filter((action) => !FORCED_ACTIONS.includes(action.type));
  if (playerActions.length === 0) return [];

  try {
    const seed = structuredClone(state);
    for (const player of seed.players) {
      if (player.inHand) player.status = 'active';
    }

    let replay = restartHand(seed);
    replay.actionHistory = structuredClone(
      state.actionHistory.filter((action) => FORCED_ACTIONS.includes(action.type)),
    );

    const checkpoints: GameState[] = [];
    for (const action of playerActions) {
      while (replay.currentRound !== action.round && replay.currentRound !== 'showdown') {
        checkpoints.push(replay);
        replay = advanceRound(replay);
      }
      if (replay.currentRound !== action.round) return [];

      checkpoints.push(replay);
      const actor = replay.players.find((player) => player.id === action.playerId);
      if (!actor) return [];

      let next = applyAction(replay, action.playerId, action.type, action.amount);
      next.actionHistory[next.actionHistory.length - 1] = structuredClone(action);

      const outcome = getHandOutcome(next);
      if (outcome === 'uncontested') return checkpoints.slice(-UNDO_LIMIT);
      if (isBettingRoundComplete(next)) {
        next.currentPlayerSeat = null;
      } else {
        next.currentPlayerSeat = getNextActableSeat(next, actor.seat);
      }
      replay = next;
    }

    return checkpoints.slice(-UNDO_LIMIT);
  } catch {
    return [];
  }
}

interface GameStore {
  game: GameState | null;
  undoStack: GameState[];
  savedGameAvailable: GameState | null;

  // Setup
  beginSetup: (settings?: Partial<GameSettings>) => void;
  updateSettings: (patch: Partial<GameSettings>) => void;
  addPlayer: (name: string, seat: number, startingChips?: number, profileId?: string) => void;
  linkProfile: (playerId: string, profileId: string) => void;
  removePlayerFromSetup: (playerId: string) => void;
  movePlayerSeat: (playerId: string, direction: 'up' | 'down') => void;
  swapPlayerSeats: (playerIdA: string, playerIdB: string) => void;
  startGame: (dealerSeat: number) => void;

  // In-hand actions
  playerAction: (playerId: string, type: ActionType, amount?: number) => void;
  callAllPreflop: () => void;
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
  renamePlayer: (playerId: string, name: string) => void;
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
    if (useStorageStatus.getState().error) throw new Error('Resolve the storage error before continuing.');
    const undo = opts.clearUndo ? [] : opts.pushUndoFrom ? [...get().undoStack,opts.pushUndoFrom].slice(-UNDO_LIMIT) : get().undoStack;
    saveGame(next, undo);
    set((s) => ({
      game: next,
      undoStack: opts.clearUndo
        ? []
        : opts.pushUndoFrom
          ? [...s.undoStack, opts.pushUndoFrom].slice(-UNDO_LIMIT)
          : s.undoStack,
    }));
  }

  return {
    game: initialSaved?.status === 'ended' ? initialSaved : null,
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

    addPlayer: (name, seat, startingChips, profileId) => {
      const state = get().game;
      if (!state) return;
      const chips = startingChips ?? state.settings.startingStack;
      const next = addPlayerEngine(state, name, seat, chips);
      const profile = profileId ? loadProfiles().find(p=>p.id===profileId) : createProfile(name);
      if (!profile || state.players.some(p=>p.profileId===profile.id)) throw new Error('Profile is missing or already at the table.');
      next.players[next.players.length-1].profileId = profile.id;
      commit(next, state.status === 'setup' ? {} : { pushUndoFrom: state });
    },

    linkProfile: (playerId, profileId) => {
      const state=get().game;
      if (!state || !loadProfiles().some(p=>p.id===profileId) || state.players.some(p=>p.id!==playerId && p.profileId===profileId)) return;
      const next=structuredClone(state);
      const player=next.players.find(p=>p.id===playerId);
      if (!player || player.profileId) return;
      player.profileId=profileId;
      for (const hand of next.handHistory) for (const result of hand.lifetime?.players ?? []) {
        if (result.playerId===playerId && !result.profileId) result.profileId=profileId;
      }
      const undoStack=get().undoStack.map(checkpoint=>{
        const linked=structuredClone(checkpoint);
        const participant=linked.players.find(p=>p.id===playerId);
        if(participant && !participant.profileId)participant.profileId=profileId;
        for(const hand of linked.handHistory)for(const result of hand.lifetime?.players ?? [])if(result.playerId===playerId && !result.profileId)result.profileId=profileId;
        return linked;
      });
      saveGame(next,undoStack);set({game:next,undoStack});
    },

    removePlayerFromSetup: (playerId) => {
      const state = get().game;
      if (!state) return;
      let next = removePlayerEngine(state, playerId);
      if (state.status === 'in_progress' || state.status === 'paused') {
        next = resolveOutcome(next);
        if (next.status !== 'hand_complete' && state.currentPlayerSeat === state.players.find(p => p.id === playerId)?.seat) {
          next.currentPlayerSeat = isBettingRoundComplete(next) ? null : getNextActableSeat(next, state.currentPlayerSeat!);
        }
      }
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

    startGame: (dealerSeat) => {
      const state = get().game;
      if (!state || state.players.length < 2 || !state.players.some((player) => player.seat === dealerSeat)) return;
      const next = startNewHand(state, dealerSeat);
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

      commit(next, { pushUndoFrom: state });
    },

    callAllPreflop: () => {
      const state = get().game;
      if (!state || state.status !== 'in_progress' || state.currentRound !== 'preflop') return;

      let next = state;
      let actionsApplied = 0;
      const safetyLimit = state.players.length + 1;

      while (next.currentPlayerSeat !== null && actionsApplied < safetyLimit) {
        const actor = next.players.find((player) => player.seat === next.currentPlayerSeat);
        if (!actor) break;

        const legal = getLegalActions(next, actor);
        const action: ActionType | null = legal.includes('call')
          ? 'call'
          : legal.includes('check')
            ? 'check'
            : null;
        if (!action) break;

        let afterAction = applyAction(next, actor.id, action);
        actionsApplied += 1;
        if (isBettingRoundComplete(afterAction)) {
          afterAction.currentPlayerSeat = null;
        } else {
          afterAction.currentPlayerSeat = getNextActableSeat(afterAction, actor.seat);
        }
        next = afterAction;
      }

      if (actionsApplied > 0) commit(next, { pushUndoFrom: state });
    },

    advanceToNextRound: () => {
      const state = get().game;
      if (!state) return;
      let next = advanceRound(state);
      const outcome = getHandOutcome(next);
      if (outcome === 'uncontested') next = resolveOutcome(next);
      commit(next, { pushUndoFrom: state });
    },

    confirmShowdown: (winnersByPotId) => {
      const state = get().game;
      if (!state) return;
      let next = awardPots(state, winnersByPotId);
      next = finalizeHand(next);
      commit(next, { pushUndoFrom: state });
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
      if (stack.length > 0) {
        const prev = stack[stack.length - 1];
        saveGame(prev,stack.slice(0,-1));
        set({ game: prev, undoStack: stack.slice(0, -1) });
        return;
      }

      const state = get().game;
      if (!state) return;
      const restored = undoFinalizedHand(state);
      if (!restored) return;
      saveGame(restored);
      set({ game: restored, undoStack: [] });
    },

    canUndo: () => {
      if (get().undoStack.length > 0) return true;
      const state = get().game;
      if (!state || state.status !== 'hand_complete') return false;
      const completedHand = state.handHistory[state.handHistory.length - 1];
      const finalAction = state.actionHistory[state.actionHistory.length - 1];
      return Boolean(
        completedHand &&
          completedHand.handNumber === state.handNumber &&
          (state.currentRound === 'showdown' || finalAction?.type === 'fold'),
      );
    },

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

    renamePlayer: (playerId, name) => {
      const state = get().game;
      if (!state) return;
      const next = renamePlayerEngine(state, playerId, name);
      if (next === state) return;
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
      set({ game: saved, savedGameAvailable: null, undoStack: loadUndo().length ? loadUndo() : saved.handAccounting ? [] : rebuildHandUndoStack(saved) });
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
