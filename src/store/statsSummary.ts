import type { CompletedHand } from '../types/stats';
export interface Totals { hands:number; profit:number; wins:number; losses:number; even:number; best:number; worst:number; sessions:Set<string> }
export function emptyTotals(): Totals { return {hands:0,profit:0,wins:0,losses:0,even:0,best:-Infinity,worst:Infinity,sessions:new Set()}; }
export function accumulate(t:Totals,profit:number,gameId:string) {
  t.hands++; t.profit+=profit; t.wins+=Number(profit>0);t.losses+=Number(profit<0);t.even+=Number(profit===0);
  t.best=Math.max(t.best,profit);t.worst=Math.min(t.worst,profit);t.sessions.add(gameId);
}
export function summarize(hand:CompletedHand, totals:Map<string,Map<string,Totals>>) {
  for (const p of hand.players) {
    if (!p.profileId) continue;
    let currencies=totals.get(p.profileId);if(!currencies){currencies=new Map();totals.set(p.profileId,currencies);}
    let t=currencies.get(hand.currency);if(!t){t=emptyTotals();currencies.set(hand.currency,t);}
    accumulate(t,p.profit*hand.chipValue,hand.gameId);
  }
}
export function money(n:number,currency:string) { return `${n>0?'Profit +':n<0?'Loss −':'Break-even '}${currency}${Math.abs(n).toLocaleString('en-IN',{maximumFractionDigits:2})}`; }
