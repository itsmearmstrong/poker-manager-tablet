import React from 'react';
import { createRoot } from 'react-dom/client';
import PokerTable from '../src/components/table/PokerTable';
import { createDefaultSettings,createInitialGameState,createPlayer } from '../src/gameEngine/gameFactory';
import { addPlayer } from '../src/gameEngine/hostActions';
import '../src/index.css';
const game=createInitialGameState(createDefaultSettings());
game.players=Array.from({length:12},(_,i)=>({...createPlayer(`Player ${i+1}`,i+1,1000),currentBet:20}));
game.currentRound='river';game.currentPlayerSeat=12;game.status='in_progress';
let rejects13=false;try{addPlayer(game,'Extra',13,1000);}catch{rejects13=true;}
createRoot(document.getElementById('root')!).render(<div style={{width:960,height:400,margin:8}}><PokerTable game={game} onOpenPlayer={()=>{}}/><pre id="checks" style={{position:'fixed',bottom:0,color:'white'}}/></div>);
setTimeout(()=>{
 const table=document.querySelector('.poker-table')!.getBoundingClientRect();
 const cards=[...document.querySelectorAll('.player-seat')].map(e=>e.getBoundingClientRect());
 const inside=cards.every(r=>r.left>=table.left&&r.right<=table.right&&r.top>=table.top&&r.bottom<=table.bottom);
 const separate=cards.every((a,i)=>cards.every((b,j)=>i===j||a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top));
 document.getElementById('checks')!.textContent=JSON.stringify({count:cards.length,inside,separate,rejects13});
},500);
