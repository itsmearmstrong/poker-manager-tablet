import { useGameStore } from './store/gameStore';
import SetupScreen from './components/setup/SetupScreen';
import GameScreen from './components/table/GameScreen';
import ResumePrompt from './components/common/ResumePrompt';

function App() {
  const game = useGameStore((s) => s.game);
  const savedGameAvailable = useGameStore((s) => s.savedGameAvailable);

  if (savedGameAvailable) return <ResumePrompt />;

  return game && game.status !== 'setup' ? <GameScreen /> : <SetupScreen />;
}

export default App;
