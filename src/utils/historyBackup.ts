import { Capacitor,registerPlugin } from '@capacitor/core';
const files=registerPlugin<{save(options:{data:string;name:string}):Promise<void>;read():Promise<{data:string}>}>('HistoryFiles');
export const isAndroid=()=>Capacitor.isNativePlatform();
export async function readHistory(){return (await files.read()).data;}
export async function exportHistory(data:string) {
  const name=`poker-history-${new Date().toISOString().slice(0,10)}.json`;
  if(Capacitor.isNativePlatform()){await files.save({data,name});return;}
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
