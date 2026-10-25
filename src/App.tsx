import { useGameStore } from './store/gameStore';
import SetupScreen from './components/setup/SetupScreen';
import GameScreen from './components/table/GameScreen';
import ResumePrompt from './components/common/ResumePrompt';
import { retryStorage,useStorageStatus,loadGame,loadUndo } from './store/persistence';

function App() {
  const game = useGameStore((s) => s.game);
  const savedGameAvailable = useGameStore((s) => s.savedGameAvailable);
  const error=useStorageStatus(s=>s.error);
  if(error)return <div role="alert" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"><div className="stats-panel max-w-lg"><p>{error}</p><button className="stats-button" onClick={async()=>{await retryStorage();if(!useStorageStatus.getState().error)useGameStore.setState({game:loadGame(),undoStack:loadUndo(),savedGameAvailable:null});}}>Retry saving</button></div></div>;

  return <>
    {savedGameAvailable ? <ResumePrompt /> : game && game.status !== 'setup' ? <GameScreen /> : <SetupScreen />}
  </>;
}

export default App;
