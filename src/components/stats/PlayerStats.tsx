import { useEffect,useState } from 'react';
import Modal from '../common/Modal';
import ProfileChoice from './ProfileChoice';
import { createProfile,loadProfiles } from '../../store/profiles';
import { useGameStore } from '../../store/gameStore';
import { retryStorage,useStorageStatus } from '../../store/persistence';
import { applyArchiveOps,getSessions,visitHands } from '../../store/statsArchive';
import { money,summarize } from '../../store/statsSummary';
import type { Totals } from '../../store/statsSummary';
import type { CompletedHand,Profile,Session } from '../../types/stats';
import { newId } from '../../utils/id';

interface Unlinked { key:string; gameId:string; playerId:string; name:string }
export default function PlayerStats({onClose,initialProfileId}:{onClose:()=>void;initialProfileId?:string}) {
  const revision=useStorageStatus(s=>s.revision);
  const [selected,setSelected]=useState(initialProfileId || '');
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [totals,setTotals]=useState(new Map<string,Map<string,Totals>>());
  const [sessions,setSessions]=useState<Session[]>([]);
  const [unlinked,setUnlinked]=useState<Unlinked[]>([]);
  const [linking,setLinking]=useState<Unlinked>();
  const [profileId,setProfileId]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const [listLimit,setListLimit]=useState(25);
  useEffect(()=>{
    let cancelled=false;
    async function read() {
      const all=new Map<string,Map<string,Totals>>();
      const missing=new Map<string,Unlinked>();
      const current=useGameStore.getState().game;
      for(const p of current?.players ?? []) if(!p.profileId) missing.set(`${current!.gameId}:${p.id}`,{key:`${current!.gameId}:${p.id}`,gameId:current!.gameId,playerId:p.id,name:p.name});
      await visitHands(h=>{
        summarize(h,all);
        for(const p of h.players) {
          if(!p.profileId) missing.set(`${h.gameId}:${p.playerId}`,{key:`${h.gameId}:${p.playerId}`,gameId:h.gameId,playerId:p.playerId,name:p.name});

        }
      });
      const savedSessions=await getSessions();
      if(!cancelled){setProfiles(loadProfiles());setTotals(all);setSessions(savedSessions);setUnlinked([...missing.values()]);}
    }
    read().catch(e=>setMessage(String(e)));
    return ()=>{cancelled=true;};
  },[revision,refresh]);
  async function link() {
    if(!linking)return;
    setBusy(true);
    try {
      const id=profileId || createProfile(linking.name).id;
      const current=useGameStore.getState().game;
      // Link the active state and its persisted history through normal reconciliation.
      if(current?.gameId===linking.gameId) {
        if(current.players.some(p=>p.id!==linking.playerId && p.profileId===id))throw new Error('That profile is already at this table.');
        useGameStore.getState().linkProfile(linking.playerId,id);await retryStorage();
      } else {
        const changed:CompletedHand[]=[];
        await visitHands(h=>{
          if(h.gameId!==linking.gameId)return;
          const p=h.players.find(p=>p.playerId===linking.playerId && !p.profileId);if(!p)return;
          if(h.players.some(other=>other.profileId===id))throw new Error('That profile already participated in this hand.');
          p.profileId=id;changed.push(h);
        });
        const session=sessions.find(s=>s.id===linking.gameId);if(!session)throw new Error('Session not found');
        await applyArchiveOps([{id:newId(),put:changed,remove:[],session}]);
      }
      setLinking(undefined);setProfileId('');setRefresh(n=>n+1);
    } catch(e){setMessage(String(e));} finally{setBusy(false);}
  }
  const profile=profiles.find(p=>p.id===selected);
  return <Modal title={profile?`Player Stats — ${profile.name}`:'Lifetime Player Stats'} onClose={onClose} width="max-w-3xl" contentClassName="flex flex-col overflow-hidden">
    <div className="stats-scroll min-h-0 overflow-y-auto" style={{maxHeight:'70vh'}}>
      {message&&<p role="status" className="mb-3 text-gold-400">{message}</p>}
      {selected&&<button className="stats-button" onClick={()=>setSelected('')}>← All players</button>}
      <table className="stats-table w-full text-base">
        <thead><tr className="border-b border-ink-700 text-left text-sm uppercase tracking-wide text-ink-500">
          <th scope="col" className="py-3 pr-3">Player</th><th scope="col" className="py-3 text-right">Profit / Loss</th>
        </tr></thead>
        <tbody>{profiles.filter(p=>!selected||p.id===selected).slice(0,listLimit).map(p=><tr key={p.id} className="border-b border-ink-700">
          <td className="py-3 pr-3 text-white">{p.name}</td>
          <td className="py-3 text-right font-semibold">
            {[...(totals.get(p.id)??[])].map(([currency,t])=><div key={currency} className={t.profit<0?'text-red-400':'text-green-400'}>{money(t.profit,currency)}</div>)}
            {!totals.has(p.id)&&<span className="text-ink-500">—</span>}
          </td>
        </tr>)}</tbody>
      </table>
      {!profiles.length&&<p className="py-3 text-ink-500">No saved players yet.</p>}
      {!selected&&profiles.length>listLimit&&<button className="stats-button" onClick={()=>setListLimit(n=>n+25)}>Show more players</button>}
      {unlinked.length>0&&<details className="mt-3">
        <summary className="min-h-12 cursor-pointer py-3 text-gold-400">Link players to include their results</summary>
        {unlinked.slice(0,listLimit).map(p=><button key={p.key} className="stats-button" onClick={()=>setLinking(p)}>Link {p.name}</button>)}
        {unlinked.length>listLimit&&<button className="stats-button" onClick={()=>setListLimit(n=>n+25)}>Show more</button>}
      </details>}
    </div>
    {linking&&<Modal title={`Link ${linking.name}`} onClose={()=>setLinking(undefined)}>
      <ProfileChoice value={profileId} onChange={p=>setProfileId(p?.id || '')}/>
      <button className="stats-button" disabled={busy} onClick={link}>Confirm profile link</button>
    </Modal>}
  </Modal>;
}
