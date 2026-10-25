import { loadProfiles } from '../../store/profiles';
import type { Profile } from '../../types/stats';
export default function ProfileChoice({value,onChange}:{value:string;onChange:(profile:Profile|undefined)=>void}) {
  const profiles=loadProfiles();
  return <label className="block mb-3 text-sm text-white">Player profile
    <select className="stats-input" value={value} onChange={e=>onChange(profiles.find(p=>p.id===e.target.value))}>
      <option value="">Create a new profile (even if names match)</option>
      {profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  </label>;
}
