import { profileData, saveProfiles } from './profiles';
import type { Profile } from '../types/stats';
export function loadPlayerRoster(): Profile[] {
  const data=profileData();
  return data.roster.map(id=>data.profiles.find(p=>p.id===id)).filter((p):p is Profile=>Boolean(p));
}
export function savePlayerRoster(profiles: Profile[]): Profile[] {
  const data=profileData(); data.roster=profiles.map(p=>p.id); saveProfiles(data); return profiles;
}
