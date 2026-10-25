import type { ArchiveOp, CompletedHand, Profile, Session } from '../types/stats';
let database: Promise<IDBDatabase> | undefined;
export function openArchive(): Promise<IDBDatabase> {
  return database ??= new Promise((resolve, reject) => {
    const r = indexedDB.open('poker-player-history', 1);
    r.onupgradeneeded = () => {
      const hands = r.result.createObjectStore('hands', { keyPath: 'id' });
      hands.createIndex('gameId', 'gameId');
      r.result.createObjectStore('sessions', { keyPath: 'id' });
      r.result.createObjectStore('importProfiles', { keyPath: 'id' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => { database = undefined; reject(r.error); };
  });
}
function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve,reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error || new Error('History transaction failed'));
  });
}
export async function applyArchiveOps(ops: ArchiveOp[]) {
  if (!ops.length) return;
  const db = await openArchive();
  const tx = db.transaction(['hands','sessions'], 'readwrite');
  const done = finished(tx);
  for (const op of ops) {
    for (const id of op.remove) tx.objectStore('hands').delete(id);
    for (const h of op.put) tx.objectStore('hands').put(h);
    tx.objectStore('sessions').put(op.session);
  }
  await done;
}
export async function visitHands(visitor: (hand: CompletedHand) => void) {
  const db = await openArchive();
  return new Promise<void>((resolve,reject) => {
    const r = db.transaction('hands').objectStore('hands').openCursor();
    r.onerror = () => reject(r.error);
    r.onsuccess = () => { const c = r.result; if (!c) { resolve(); return; } try { visitor(c.value); c.continue(); } catch(e) { reject(e); } };
  });
}
export async function getSessions(): Promise<Session[]> {
  const db = await openArchive();
  return new Promise((resolve,reject) => {
    const r = db.transaction('sessions').objectStore('sessions').getAll();
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
export interface Backup { version: 1; profiles: Profile[]; hands: CompletedHand[]; sessions: Session[] }
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e15;
export function validateBackup(input: unknown): Backup {
  if (!input || typeof input !== 'object') throw new Error('Invalid backup');
  const b = input as Backup;
  if (b.version !== 1 || !Array.isArray(b.profiles) || !Array.isArray(b.hands) || !Array.isArray(b.sessions)) throw new Error('Unsupported backup format');
  const profiles = new Set<string>(), hands = new Set<string>(), sessions = new Set<string>();
  for (const p of b.profiles) {
    if (!p || !id(p.id) || profiles.has(p.id) || !id(p.name) || !finite(p.createdAt)) throw new Error('Invalid profile');
    profiles.add(p.id);
  }
  for (const s of b.sessions) {
    if (!s || !id(s.id) || sessions.has(s.id) || !id(s.name) || !finite(s.updatedAt) || !['ongoing','completed'].includes(s.status)) throw new Error('Invalid session');
    sessions.add(s.id);
  }
  for (const h of b.hands) {
    if (!h || h.version !== 1 || !id(h.gameId) || h.id !== `${h.gameId}:${h.handNumber}` || hands.has(h.id) || !sessions.has(h.gameId) ||
      !Number.isSafeInteger(h.handNumber) || h.handNumber < 1 || !finite(h.completedAt) || !id(h.gameName) || !id(h.currency) ||
      !finite(h.chipValue) || h.chipValue <= 0 || !Array.isArray(h.players) || !h.players.length || h.players.length > 12 || !Array.isArray(h.changes) || !Array.isArray(h.pots)) throw new Error('Invalid hand');
    hands.add(h.id);
    const participants = new Set<string>(), linked = new Set<string>();
    for (const p of h.players) {
      if (!p || !id(p.playerId) || participants.has(p.playerId) || !id(p.name) ||
        (p.profileId !== undefined && (!profiles.has(p.profileId) || linked.has(p.profileId))) ||
        ![p.startingChips,p.endingChips,p.additions,p.withdrawals,p.profit].every(finite) ||
        [p.startingChips,p.endingChips,p.additions,p.withdrawals].some(n=>n<0) ||
        Math.abs(p.profit-(p.endingChips-p.startingChips-p.additions+p.withdrawals))>1e-6) throw new Error('Invalid player accounting');
      participants.add(p.playerId); if (p.profileId) linked.add(p.profileId);
    }
    if (Math.abs(h.players.reduce((s,p)=>s+p.profit,0))>1e-6) throw new Error('Hand does not balance');
    for (const c of h.changes) if (!c || !id(c.playerId) || !['rebuy','correction'].includes(c.kind) || !finite(c.delta) || !finite(c.timestamp)) throw new Error('Invalid adjustment');
    for (const p of h.players) {
      const changes = h.changes.filter(c=>c.playerId===p.playerId);
      if (Math.abs(changes.reduce((s,c)=>s+Math.max(0,c.delta),0)-p.additions)>1e-6 ||
        Math.abs(changes.reduce((s,c)=>s+Math.max(0,-c.delta),0)-p.withdrawals)>1e-6) throw new Error('Adjustment totals differ');
    }
    const pots = new Set<string>();
    for (const p of h.pots) {
      if (!p || !id(p.id) || pots.has(p.id) || !finite(p.amount) || p.amount<0 || !Array.isArray(p.eligiblePlayerIds) ||
        !Array.isArray(p.winnerIds) || !p.winnerIds.length || new Set(p.winnerIds).size!==p.winnerIds.length || !p.amountWon ||
        p.winnerIds.some(w=>!participants.has(w) || !p.eligiblePlayerIds.includes(w)) ||
        Object.entries(p.amountWon).some(([w,n])=>!p.winnerIds!.includes(w) || !finite(n) || n<0) ||
        Math.abs(Object.values(p.amountWon).reduce((s,n)=>s+n,0)-p.amount)>1e-6) throw new Error('Invalid pot awards');
      pots.add(p.id);
    }
  }
  return b;
}
export async function importArchive(b: Backup, activeGameId?: string) {
  const db = await openArchive();
  const tx = db.transaction(['hands','sessions','importProfiles'],'readwrite');
  const done = finished(tx);
  let conflict = '';
  for(const p of b.profiles) tx.objectStore('importProfiles').put(p);
  for (const [store,rows] of [['hands',b.hands],['sessions',b.sessions]] as const) for (const row of rows) {
    const r = tx.objectStore(store).get(row.id);
    r.onsuccess = () => {
      if (r.result && JSON.stringify(r.result)!==JSON.stringify(row)) {
        conflict = `Conflicting ${store} record ${row.id}. Nothing imported.`; tx.abort();
      } else if (!r.result) {
        if ((store==='hands' ? (row as CompletedHand).gameId : row.id)===activeGameId) {
          conflict='Backup cannot add records to the active game.'; tx.abort();
        } else tx.objectStore(store).put(row);
      }
    };
  }
  try { await done; } catch(e) { throw new Error(conflict || String(e)); }
}
export async function recoverImportedProfiles(): Promise<Profile[]> {
  const db=await openArchive();
  return new Promise((resolve,reject)=>{const r=db.transaction('importProfiles').objectStore('importProfiles').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
