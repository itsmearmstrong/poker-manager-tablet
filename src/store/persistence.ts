import { create } from 'zustand';
import type { GameState } from '../types/poker';
import type { ArchiveOp } from '../types/stats';
import { applyArchiveOps,recoverImportedProfiles } from './statsArchive';
import { profileData,saveProfiles } from './profiles';
import { newId } from '../utils/id';
const KEY = 'poker-night-game-v1';
interface Envelope { version: 2; state: GameState | null; pending: ArchiveOp[]; undo: GameState[] }
export const useStorageStatus = create<{ error: string; revision: number }>(() => ({ error: '', revision: 0 }));
export function reportStorageError(error: unknown) { useStorageStatus.setState({ error: `Saving failed: ${String(error)}. Keep the app open and retry.` }); }
function read(): Envelope {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { version: 2, state: null, pending: [], undo: [] };
  const p = JSON.parse(raw);
  return p.version === 2 ? p : { version: 2, state: p, pending: [], undo: [] };
}
let cached: Envelope | undefined;
function current() { return cached ??= read(); }
let failed: Envelope | undefined;
function write(envelope: Envelope) {
  try { localStorage.setItem(KEY, JSON.stringify(envelope)); cached=envelope; failed=undefined; }
  catch(e) { failed=envelope; reportStorageError(e); throw e; }
}
let draining: Promise<void> | undefined;
export function retryStorage(): Promise<void> {
  if (draining) return draining;
  draining=(async()=>{
    if (failed) write(failed);
    const imported=await recoverImportedProfiles();
    if(imported.length){const data=profileData();let changed=false;for(const p of imported)if(!data.profiles.some(v=>v.id===p.id)){data.profiles.push(p);data.roster.push(p.id);changed=true;}if(changed)saveProfiles(data);}
    while (current().pending.length) {
      const ops=current().pending.slice();
      await applyArchiveOps(ops);
      const ids=new Set(ops.map(op=>op.id));
      write({...current(),pending:current().pending.filter(op=>!ids.has(op.id))});
    }
    useStorageStatus.setState(s=>({error:'',revision:s.revision+1}));
  })().catch(reportStorageError).finally(()=>{draining=undefined;});
  return draining;
}
export function saveGame(state: GameState, undo: GameState[] = []): void {
  const before=current();
  const previous=before.state?.gameId===state.gameId ? before.state : null;
  const old=new Map(previous?.handHistory.filter(h=>h.lifetime).map(h=>[h.lifetime!.id,h.lifetime!]) ?? []);
  const records=state.handHistory.filter(h=>h.lifetime).map(h=>h.lifetime!);
  const ids=new Set(records.map(h=>h.id));
  const put=records.filter(h=>JSON.stringify(old.get(h.id))!==JSON.stringify(h));
  const remove=[...old.keys()].filter(id=>!ids.has(id));
  const pending=before.pending.slice();
  if (put.length || remove.length || previous?.status!==state.status) pending.push({
    id:newId(),put,remove,session:{id:state.gameId,name:state.gameName,
      status:state.status==='ended'?'completed':'ongoing',updatedAt:state.updatedAt},
  });
  write({version:2,state,pending,undo});
  if (pending.length) void retryStorage();
}
export function loadGame(): GameState | null {
  try {
    let state=current().state;
    // Normalize games saved by the earlier removal behavior, which hid players but
    // retained their stack. Removed stacks are withdrawals, not poker losses.
    if (state?.players.some(p=>p.removed && p.chips>0)) {
      state=structuredClone(state);
      for(const player of state.players) if(player.removed && player.chips>0) {
        const withdrawn=player.chips;
        if(state.handAccounting && (state.status==='in_progress'||state.status==='paused')) {
          state.handAccounting.changes.push({playerId:player.id,kind:'correction',delta:-withdrawn,timestamp:Date.now()});
        }
        player.chips=0;
      }
      write({...current(),state});
    }
    Promise.resolve().then(()=>retryStorage()); return state;
  }
  catch(e) { reportStorageError(e); return null; }
}
export function loadUndo(): GameState[] { try { return current().undo; } catch { return []; } }
export function clearSavedGame(): void {
  const before=current(); const pending=before.pending.slice();
  if (before.state) pending.push({id:newId(),put:[],remove:[],session:{
    id:before.state.gameId,name:before.state.gameName,status:'completed',updatedAt:Date.now(),
  }});
  write({version:2,state:null,pending,undo:[]}); void retryStorage();
}
