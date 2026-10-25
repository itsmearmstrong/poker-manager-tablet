import type { Profile } from '../types/stats';
import { newId } from '../utils/id';
import { reportStorageError } from './persistence';
const KEY='poker-player-profiles-v1';
interface Profiles { version: 1; profiles: Profile[]; roster: string[] }
export function profileData(): Profiles {
  const raw=localStorage.getItem(KEY);
  if (raw) return JSON.parse(raw);
  const old=JSON.parse(localStorage.getItem('poker-night-player-roster-v1') || '[]') as string[];
  const profiles=old.map(name=>({id:newId(),name,createdAt:Date.now()}));
  const data:Profiles={version:1,profiles,roster:profiles.map(p=>p.id)};
  saveProfiles(data);
  return data;
}
export function saveProfiles(data: Profiles) { try { localStorage.setItem(KEY,JSON.stringify(data)); } catch(e) { reportStorageError(e);throw e; } }
export function loadProfiles() { return profileData().profiles; }
export function createProfile(name:string): Profile {
  const data=profileData();
  const profile={id:newId(),name:name.trim(),createdAt:Date.now()};
  if (!profile.name) throw new Error('Enter a player name.');
  data.profiles.push(profile); data.roster.push(profile.id); saveProfiles(data); return profile;
}
