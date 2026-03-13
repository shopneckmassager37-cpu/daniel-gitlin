
import React, { useState, useEffect, useMemo } from 'react';
import { Subject, Grade, User, HistoryItem, LearningGame, GameType, GameScore } from '../types.ts';
import { dbService } from '../services/dbService.ts';
import { 
  Gamepad2, Trophy, History as HistoryIcon, Play, 
  RotateCcw, ChevronLeft, ArrowRight, Star, 
  Dices, Target, HelpCircle, Brain, 
  Search, Trash2, Plus, Users, Crown,
  Clock, CheckCircle2, XCircle, Sparkles,
  Loader2, Timer, Grid, Hash, LayoutGrid, MousePointer2
} from 'lucide-react';
import LatexRenderer from './LatexRenderer.tsx';

interface LearningGamesViewProps {
  user: User;
  subject: Subject;
  grade: Grade;
  onBack: () => void;
  onAddHistoryItem: (item: HistoryItem) => void;
}

const LearningGamesView: React.FC<LearningGamesViewProps> = ({ user, subject, grade, onBack, onAddHistoryItem }) => {
  const [activeGame, setActiveGame] = useState<LearningGame | null>(null);
  const [games, setGames] = useState<LearningGame[]>([]);
  const [view, setView] = useState<'HISTORY' | 'SELECT_TYPE' | 'SELECT_TOPIC'>('SELECT_TYPE');
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);
  const [backClicked, setBackClicked] = useState(false);

  const isTeacher = user.role === 'TEACHER';

  useEffect(() => {
    const loadGames = async () => {
      try {
        const remoteGames = await dbService.getGames(user.id);
        if (remoteGames.length > 0) {
          setGames(remoteGames);
          localStorage.setItem('lumdim_learning_games_v1', JSON.stringify(remoteGames));
        } else {
          const savedGames = localStorage.getItem('lumdim_learning_games_v1');
          if (savedGames) setGames(JSON.parse(savedGames));
        }
      } catch (e) {
        console.error("Failed to load games from Supabase", e);
        const savedGames = localStorage.getItem('lumdim_learning_games_v1');
        if (savedGames) setGames(JSON.parse(savedGames));
      }
    };

    const loadHistory = () => {
      const savedHistory = localStorage.getItem(`game_history_${user.id}`);
      if (savedHistory) {
        setGameHistory(JSON.parse(savedHistory));
      }
    };

    loadGames();
    loadHistory();
  }, [user.id]);

  const recommendedGames = useMemo(() => {
    return games.filter(g => g.subject === subject).slice(0, 3);
  }, [games, subject]);

  const handleGenerateGame = async () => {
    if (!selectedGameType || !topic.trim()) return;
    setIsGenerating(true);
    try {
      const { generateGameContent } = await import('../services/geminiService.ts');
      const content = await generateGameContent(subject, grade, selectedGameType, topic);
      
      const newGame: LearningGame = {
        id: `game-${Date.now()}`,
        title: topic,
        type: selectedGameType,
        subject,
        grade,
        timestamp: Date.now(),
        content,
        leaderboardEnabled
      };

      setActiveGame(newGame);
      setGames(prev => {
        const newGames = [newGame, ...prev];
        localStorage.setItem('lumdim_learning_games_v1', JSON.stringify(newGames));
        return newGames;
      });
      
      if (isTeacher) {
        dbService.saveGame(newGame).catch(err => console.error("Failed to save game to Supabase:", err));
      }
    } catch (e) {
      alert("שגיאה בייצור המשחק. נסה שוב.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveGameResult = (game: LearningGame, score: number, timeSeconds?: number) => {
    const result = {
      id: `res-${Date.now()}`,
      gameId: game.id,
      gameTitle: game.title,
      gameType: game.type,
      score,
      timeSeconds,
      timestamp: Date.now(),
      gameContent: game.content
    };

    const newHistory = [result, ...gameHistory];
    setGameHistory(newHistory);
    localStorage.setItem(`game_history_${user.id}`, JSON.stringify(newHistory));

    // Add to general history
    onAddHistoryItem({
      id: result.id,
      timestamp: result.timestamp,
      subject: game.subject,
      grade: game.grade,
      type: 'GAME',
      title: `משחק: ${game.title}`,
      score: score,
      details: result
    });

    // Update game scores for leaderboard
    const updatedGames = games.map(g => {
      if (g.id === game.id) {
        const newScores = [...(g.scores || [])];
        const existingIdx = newScores.findIndex(s => s.studentId === user.id);
        
        const newScoreObj: GameScore = { 
          studentId: user.id, 
          studentName: user.name, 
          score, 
          timeSeconds, 
          timestamp: Date.now() 
        };

        if (existingIdx !== -1) {
          // Update if score is better, or same score but better time
          const prev = newScores[existingIdx];
          const isBetterScore = score > prev.score;
          const isSameScoreBetterTime = score === prev.score && (timeSeconds !== undefined && (prev.timeSeconds === undefined || timeSeconds < prev.timeSeconds));
          
          if (isBetterScore || isSameScoreBetterTime) {
            newScores[existingIdx] = newScoreObj;
          }
        } else {
          newScores.push(newScoreObj);
        }
        return { ...g, scores: newScores };
      }
      return g;
    });
    setGames(updatedGames);
    localStorage.setItem('lumdim_learning_games_v1', JSON.stringify(updatedGames));
    
    const updatedGame = updatedGames.find(g => g.id === game.id);
    if (updatedGame) {
      dbService.saveGame(updatedGame).catch(err => console.error("Failed to sync game score to Supabase:", err));
    }
  };

  const gameTypes: { type: GameType; label: string; icon: any; color: string }[] = [
    { type: 'MEMORY', label: 'משחק זיכרון', icon: Brain, color: 'bg-blue-500' },
    { type: 'MATCHING', label: 'משחק התאמה', icon: Target, color: 'bg-emerald-500' },
    { type: 'WHEEL', label: 'גלגל מזל', icon: Target, color: 'bg-orange-500' },
    { type: 'TRIVIA', label: 'שעשעון טלוויזיה', icon: HelpCircle, color: 'bg-purple-500' },
    { type: 'WORD_SEARCH', label: 'תפזורת', icon: Search, color: 'bg-emerald-500' },
    { type: 'HANGMAN', label: 'איש תלוי', icon: Dices, color: 'bg-red-500' },
    { type: 'CROSSWORD', label: 'תשבץ', icon: Plus, color: 'bg-indigo-500' },
  ];

  return (
    <div className={`${activeGame ? 'w-full h-full' : 'max-w-7xl mx-auto p-4 md:p-8 animate-fade-in'} text-right`} dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
        <div className="flex-1">
          <div className="bg-indigo-100 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-indigo-600 shadow-xl mb-6">
            <Gamepad2 size={32} />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-2">משחקי למידה</h2>
          <p className="text-xl text-gray-500 font-medium">למדו בכיף עם מגוון משחקים אינטראקטיביים</p>
        </div>
        <div className="flex flex-col items-end gap-4">
          <button 
            onClick={() => {
              setBackClicked(true);
              if (activeGame) {
                setActiveGame(null);
              } else {
                onBack();
              }
            }} 
            className={`p-4 rounded-3xl border shadow-sm transition-all group ${backClicked ? 'bg-red-500 text-white border-red-600' : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-900'}`}
          >
            <ArrowRight size={24} className="group-hover:-translate-x-1 transition-transform rotate-180" />
          </button>
          
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex">
            <button 
              onClick={() => setView('SELECT_TYPE')} 
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === 'SELECT_TYPE' || view === 'SELECT_TOPIC' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Plus size={16} />
              <span>משחק חדש</span>
            </button>
            <button 
              onClick={() => setView('HISTORY')} 
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <HistoryIcon size={16} />
              <span>היסטוריה</span>
            </button>
          </div>
        </div>
      </div>

      {activeGame ? (
        <GameRunner 
          game={activeGame} 
          onFinish={(score, time) => {
            saveGameResult(activeGame, score, time);
            setActiveGame(null);
          }} 
          onCancel={() => setActiveGame(null)}
        />
      ) : view === 'SELECT_TYPE' ? (
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h3 className="text-3xl font-black text-gray-900">בחר סוג משחק</h3>
            <p className="text-gray-500 font-bold">איזה סוג משחק תרצה לשחק היום?</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {gameTypes.map(t => (
              <button 
                key={t.type}
                onClick={() => { setSelectedGameType(t.type); setView('SELECT_TOPIC'); }}
                className="group flex flex-col items-center gap-4 p-6 bg-white rounded-[2rem] border-2 border-gray-100 hover:border-primary hover:bg-blue-50/50 transition-all shadow-sm hover:shadow-xl"
              >
                <div className={`${t.color} p-4 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <t.icon size={24} />
                </div>
                <span className="font-black text-xs text-gray-800">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : view === 'SELECT_TOPIC' ? (
        <div className="max-w-2xl mx-auto space-y-10 py-10">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-4 mb-6">
              <button onClick={() => setView('SELECT_TYPE')} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><ArrowRight size={20}/></button>
              <h3 className="text-3xl font-black text-gray-900">על מה נשחק?</h3>
            </div>
            <p className="text-gray-500 font-bold">הכנס נושא וה-AI שלנו ייצור עבורך משחק {gameTypes.find(t => t.type === selectedGameType)?.label} בשניות!</p>
          </div>
          
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 space-y-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">נושא המשחק</label>
              <input 
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="למשל: חוקי ניוטון, בירות אירופה, לוח הכפל..."
                className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-xl outline-none focus:border-primary transition-all"
              />
            </div>

            {isTeacher && (
              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-3">
                  <Crown size={20} className="text-amber-500" />
                  <span className="font-black text-gray-700">אפשר טבלת מובילים</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={leaderboardEnabled}
                    onChange={(e) => setLeaderboardEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            )}

            <button 
              onClick={handleGenerateGame}
              disabled={!topic.trim() || isGenerating}
              className="w-full py-6 bg-primary text-white rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RotateCcw className="animate-spin" style={{ animationDirection: 'reverse' }} size={24} />
                  <span>מייצר משחק...</span>
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span>צור משחק עכשיו</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 bg-gray-50/50">
            <h3 className="text-2xl font-black text-gray-900">התוצאות האחרונות שלי</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {gameHistory.length === 0 ? (
              <div className="p-20 text-center">
                <HistoryIcon size={48} className="text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold">טרם שיחקת במשחקים. בוא נתחיל!</p>
              </div>
            ) : (
              gameHistory.map(item => (
                <div key={item.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`${gameTypes.find(t => t.type === item.gameType)?.color || 'bg-gray-500'} p-3 rounded-xl text-white`}>
                      {React.createElement(gameTypes.find(t => t.type === item.gameType)?.icon || Gamepad2, { size: 20 })}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900">{item.gameTitle}</h4>
                      <p className="text-xs text-gray-400 font-bold">{new Date(item.timestamp).toLocaleDateString('he-IL')} בשעה {new Date(item.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-black text-indigo-600">{item.score}</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ציון</div>
                    </div>
                    <button 
                      onClick={() => {
                        const existingGame = games.find(g => g.id === item.gameId);
                        if (existingGame) {
                          setActiveGame(existingGame);
                        } else if (item.gameContent) {
                          setActiveGame({
                            id: item.gameId,
                            title: item.gameTitle,
                            type: item.gameType,
                            content: item.gameContent,
                            subject: subject,
                            grade: grade,
                            timestamp: item.timestamp
                          });
                        } else {
                          alert("המשחק לא נמצא במערכת.");
                        }
                      }}
                      className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                    >
                      <RotateCcw size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Recommended Games Section */}
      {!activeGame && recommendedGames.length > 0 && (
        <div className="mt-20 space-y-8">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
              <Star size={20} fill="currentColor" />
            </div>
            <h3 className="text-2xl font-black text-gray-900">משחקים מומלצים ב{subject}</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {recommendedGames.map(game => (
              <div 
                key={game.id} 
                onClick={() => setActiveGame(game)}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`${gameTypes.find(t => t.type === game.type)?.color || 'bg-gray-500'} p-3 rounded-xl text-white`}>
                    {React.createElement(gameTypes.find(t => t.type === game.type)?.icon || Gamepad2, { size: 18 })}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800 group-hover:text-primary transition-colors">{game.title}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{game.type}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                  <span>{game.grade}</span>
                  <div className="flex items-center gap-1">
                    <Play size={12} className="text-primary" />
                    <span>שחק</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Game Components ---

export const GameRunner: React.FC<{ game: LearningGame; onFinish: (score: number, timeSeconds?: number) => void; onCancel: () => void }> = ({ game, onFinish, onCancel }) => {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'FINISHED'>('START');
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(true);

  useEffect(() => {
    let interval: any;
    if (gameState === 'PLAYING') {
      interval = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = (finalScore: number) => {
    setScore(finalScore);
    setGameState('FINISHED');
    onFinish(finalScore, time);
  };

  const renderGame = () => {
    switch (game.type) {
      case 'MEMORY': return <MemoryGame content={game.content} onFinish={handleFinish} />;
      case 'MATCHING': return <MatchingGame content={game.content} onFinish={handleFinish} />;
      case 'TRIVIA': return <TriviaGame content={game.content} onFinish={handleFinish} />;
      case 'WHEEL': return <WheelGame content={game.content} onFinish={handleFinish} />;
      case 'WORD_SEARCH': return <WordSearchGame content={game.content} onFinish={handleFinish} />;
      case 'HANGMAN': return <HangmanGame content={game.content} onFinish={handleFinish} />;
      case 'CROSSWORD': return <CrosswordGame content={game.content} onFinish={handleFinish} />;
      default: return <div className="p-20 text-center font-black text-gray-400">המשחק {game.type} בבנייה...</div>;
    }
  };

  const containerClasses = isFullscreen 
    ? "fixed inset-0 z-[9999] bg-white flex flex-col"
    : "bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 flex-1 flex flex-col w-full min-h-[600px]";

  if (gameState === 'START') {
    return (
      <div className={containerClasses}>
        {isFullscreen && (
          <div className="absolute top-6 right-6 z-10">
            <button onClick={onCancel} className="p-3 bg-gray-100 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm flex items-center gap-2 font-black text-xs">
              <XCircle size={20} />
              <span>יציאה מהמשחק</span>
            </button>
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center">
          <div className="bg-indigo-100 p-6 rounded-[2rem] text-indigo-600 mb-8">
            <Gamepad2 size={64} />
          </div>
          <h3 className="text-4xl font-black text-gray-900 mb-4">{game.title}</h3>
          <p className="text-xl text-gray-500 mb-12 max-w-md">מוכנים להתחיל? המשחק יתחיל ברגע שתלחצו על הכפתור.</p>
          <button 
            onClick={() => setGameState('PLAYING')}
            className="px-12 py-5 bg-primary text-white rounded-2xl font-black text-2xl hover:bg-blue-700 transition-all shadow-xl shadow-primary/30 flex items-center gap-4"
          >
            <Play size={28} />
            <span>התחל משחק!</span>
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'FINISHED') {
    const sortedScores = [...(game.scores || [])].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.timeSeconds || 9999) - (b.timeSeconds || 9999);
    });
    const userRank = sortedScores.findIndex(s => s.studentId === localStorage.getItem('lumdim_user_id') || s.studentName === 'אורח') + 1;

    return (
      <div className={containerClasses}>
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 text-center overflow-hidden">
          <div className="bg-green-100 p-4 rounded-2xl text-green-600 mb-4 animate-bounce">
            <Trophy size={48} />
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-1">כל הכבוד!</h3>
          <p className="text-lg text-gray-500 mb-4">סיימת את המשחק בהצלחה</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6 w-full max-w-sm">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="text-3xl font-black text-primary mb-0.5">{score}</div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ציון סופי</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="text-3xl font-black text-indigo-600 mb-0.5">{formatTime(time)}</div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">זמן</div>
            </div>
          </div>

          {game.leaderboardEnabled !== false && (
            <div className="w-full max-w-sm mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-black text-gray-900 flex items-center gap-2 text-sm">
                  <Crown size={14} className="text-amber-500" />
                  טבלת מובילים
                </h4>
                {userRank > 0 && (
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black">
                    הדירוג שלך: {userRank}
                  </span>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                {sortedScores.slice(0, 5).map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-[8px] font-black text-gray-400 border border-gray-100">{idx + 1}</span>
                      <span className="font-bold text-gray-700 text-xs">{s.studentName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-indigo-600">{s.score} נק'</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={onCancel}
            className="px-10 py-4 bg-gray-900 text-white rounded-xl font-black text-lg hover:bg-black transition-all shadow-xl flex items-center gap-3"
          >
            <ArrowRight size={20} className="rotate-180" />
            <span>חזרה לתפריט</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className="p-4 md:p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><ArrowRight size={20} className="rotate-180" /></button>
          <h3 className="text-xl font-black text-gray-900">{game.title}</h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-600 font-black">
            <Clock size={18} />
            <span>{formatTime(time)}</span>
          </div>
          {isFullscreen && (
            <button onClick={onCancel} className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all">
              <XCircle size={20} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto relative custom-scrollbar">
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          {renderGame()}
        </div>
      </div>
    </div>
  );
};

const MemoryGame: React.FC<{ content: any[]; onFinish: (score: number) => void }> = ({ content, onFinish }) => {
  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const deck = [
      ...content.map(i => ({ id: i.id, text: i.text, type: 'Q' })), 
      ...content.map(i => ({ id: i.id, text: i.match, type: 'A' }))
    ];
    setCards(deck.sort(() => Math.random() - 0.5));
  }, [content]);

  const handleFlip = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;
    
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (cards[first].id === cards[second].id && cards[first].type !== cards[second].type) {
        setTimeout(() => {
          setMatched(prev => [...prev, first, second]);
          setFlipped([]);
          if (matched.length + 2 === cards.length) {
            setTimeout(() => onFinish(Math.max(10, 100 - moves * 2)), 1000);
          }
        }, 600);
      } else {
        setTimeout(() => setFlipped([]), 1200);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <RotateCcw size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">מהלכים</p>
            <p className="font-black text-gray-900 text-xl">{moves}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
            <Trophy size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">זוגות</p>
            <p className="font-black text-gray-900 text-xl">{matched.length / 2} / {content.length}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 flex-1">
        {cards.map((card, idx) => {
          const isMatched = matched.includes(idx);
          const isFlipped = flipped.includes(idx) || isMatched;
          
          return (
            <div 
              key={idx} 
              onClick={() => handleFlip(idx)}
              className="perspective-1000 aspect-square cursor-pointer group"
            >
              <div className={`relative w-full h-full transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front (Hidden) */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-xl backface-hidden border-4 border-white/20 group-hover:scale-[1.02] transition-transform">
                  <Brain size={48} className="text-white/30" />
                </div>
                
                {/* Back (Visible) */}
                <div className="absolute inset-0 bg-white rounded-3xl flex items-center justify-center text-center p-4 shadow-xl backface-hidden rotate-y-180 border-4 border-indigo-100 overflow-hidden">
                  <span className={`font-black text-gray-800 leading-tight ${card.text.length > 30 ? 'text-xs' : card.text.length > 15 ? 'text-sm' : 'text-base md:text-xl'}`}>
                    {card.text}
                  </span>
                  {isMatched && (
                    <div className="absolute top-2 right-2 text-green-500">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TriviaGame: React.FC<{ content: any[]; onFinish: (score: number) => void }> = ({ content, onFinish }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showBonus, setShowBonus] = useState(false);

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === content[currentIdx].correct;
    setIsCorrect(correct);
    
    let points = 100 / content.length;
    let bonus = 0;
    if (correct && Math.random() > 0.7) {
      setShowBonus(true);
      bonus = 10;
    }
    
    const newScore = score + (correct ? points + bonus : 0);
    setScore(newScore);

    setTimeout(() => {
      setShowBonus(false);
      if (currentIdx < content.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setSelected(null);
        setIsCorrect(null);
      } else {
        onFinish(Math.min(100, Math.round(newScore)));
      }
    }, 1500);
  };

  const q = content[currentIdx];

  return (
    <div className="w-full h-full bg-slate-900 p-4 md:p-8 flex flex-col relative overflow-hidden rounded-[3rem]">
      {/* TV Scanlines effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
      
      <div className="relative z-20 flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-12">
          <div className="bg-indigo-600/20 px-8 py-3 rounded-full border border-indigo-500/30 backdrop-blur-sm">
            <span className="text-indigo-400 font-black text-sm uppercase tracking-widest">שאלה {currentIdx + 1} / {content.length}</span>
          </div>
          <div className="bg-amber-500/20 px-8 py-3 rounded-full border border-amber-500/30 backdrop-blur-sm">
            <span className="text-amber-400 font-black text-sm uppercase tracking-widest">נקודות: {Math.round(score)}</span>
          </div>
        </div>

        <div className="text-center mb-10">
          <h3 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-[0_0_20px_rgba(99,102,241,0.6)]">
            <LatexRenderer text={q.question} inline />
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {q.options.map((opt: string, idx: number) => (
            <button 
              key={idx}
              onClick={() => handleAnswer(idx)}
              className={`p-4 md:p-6 rounded-[2rem] font-black text-lg md:text-xl transition-all border-4 text-right flex items-center gap-4 group relative overflow-hidden
                ${selected === idx 
                  ? (isCorrect ? 'bg-green-500 border-green-400 text-white shadow-[0_0_50px_rgba(34,197,94,0.7)] scale-105' : 'bg-red-500 border-red-400 text-white shadow-[0_0_50px_rgba(239,68,68,0.7)] scale-95') 
                  : selected !== null && idx === q.correct 
                    ? 'bg-green-500/20 border-green-500 text-green-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500 hover:bg-slate-700 hover:text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:scale-[1.02]'
                }`}
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-lg md:text-xl
                ${selected === idx ? 'bg-white/20' : 'bg-slate-700 group-hover:bg-indigo-600'}`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="flex-1 text-sm md:text-base"><LatexRenderer text={opt} inline /></span>
            </button>
          ))}
        </div>

        {showBonus && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce">
            <div className="bg-amber-500 text-white px-10 py-5 rounded-[2rem] font-black text-3xl shadow-2xl border-4 border-white">
              בונוס! 🌟 +10
            </div>
          </div>
        )}

        <div className="h-20 flex items-center justify-center mt-8">
          {isCorrect !== null && (
            <div className={`text-center animate-fade-in font-black text-3xl drop-shadow-lg ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {isCorrect ? 'נכון מאוד! 🎊' : 'אופס... לא נכון ❌'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WheelGame: React.FC<{ content: any[]; onFinish: (score: number) => void }> = ({ content, onFinish }) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [feedback, setFeedback] = useState<any | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const maxRounds = 3;

  const spin = () => {
    if (spinning || showQuestion) return;
    setSpinning(true);
    setResult(null);
    setFeedback(null);
    setStudentAnswer('');
    const extraRotation = 1800 + Math.random() * 360;
    const newRotation = rotation + extraRotation;
    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      const finalAngle = newRotation % 360;
      const sectionSize = 360 / content.length;
      const index = Math.floor((360 - (finalAngle % 360)) / sectionSize) % content.length;
      const selectedItem = content[index].text || content[index];
      setResult(selectedItem);
      
      setTimeout(() => {
        setShowQuestion(true);
      }, 1000);
    }, 3000);
  };

  const handleCheckAnswer = async () => {
    if (!studentAnswer.trim() || isChecking) return;
    setIsChecking(true);
    try {
      const { gradeOpenQuestion } = await import('../services/geminiService.ts');
      const res = await gradeOpenQuestion(result!, "תשובה מקיפה ומדויקת", studentAnswer);
      setFeedback(res);
      setTotalScore(prev => prev + res.score);
      setRounds(prev => prev + 1);
    } catch (e) {
      alert("שגיאה בבדיקת התשובה.");
    } finally {
      setIsChecking(false);
    }
  };

  const colors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#06B6D4'
  ];

  return (
    <div className="flex flex-col items-center w-full h-full p-4 justify-center max-w-6xl mx-auto">
      {!showQuestion ? (
        <div className="flex flex-col items-center animate-fade-in w-full">
          <div className="flex justify-between w-full mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <RotateCcw size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">סיבוב</p>
                <p className="font-black text-gray-900 text-2xl">{rounds} / {maxRounds}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                <Trophy size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">ניקוד מצטבר</p>
                <p className="font-black text-gray-900 text-2xl">{Math.round(totalScore / (rounds || 1))}</p>
              </div>
            </div>
          </div>

          <div className="relative w-[65vmin] h-[65vmin] mb-12">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-8 z-20">
              <div className="w-10 h-14 bg-gray-900 clip-path-needle shadow-2xl"></div>
              <style>{`.clip-path-needle { clip-path: polygon(50% 100%, 0 0, 100% 0); }`}</style>
            </div>
            
            <div 
              className="w-full h-full rounded-full border-[20px] border-gray-900 shadow-[0_0_80px_rgba(0,0,0,0.4)] overflow-hidden transition-transform duration-[3000ms] cubic-bezier(0.15, 0, 0.15, 1) relative bg-gray-900"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {content.map((item, idx) => {
                  const angle = 360 / content.length;
                  const startAngle = idx * angle;
                  const endAngle = (idx + 1) * angle;
                  const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                  const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                  const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                  const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);
                  
                  const largeArcFlag = angle > 180 ? 1 : 0;
                  const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                  
                  return (
                    <g key={idx}>
                      <path d={pathData} fill={colors[idx % colors.length]} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                      <g transform={`rotate(${startAngle + angle / 2} 50 50)`}>
                        <text 
                          x="50" y="15" 
                          fill="white" 
                          fontSize="3.5" 
                          fontWeight="900" 
                          textAnchor="middle" 
                          transform="rotate(0 50 15)"
                          className="select-none drop-shadow-md"
                        >
                          {((item.text || item).toString().length > 15) ? (item.text || item).toString().substring(0, 12) + '...' : (item.text || item)}
                        </text>
                      </g>
                    </g>
                  );
                })}
                <circle cx="50" cy="50" r="10" fill="#111" stroke="#333" strokeWidth="1" />
                <circle cx="50" cy="50" r="4" fill="#fff" />
              </svg>
            </div>
          </div>

          <button 
            onClick={spin}
            disabled={spinning || rounds >= maxRounds}
            className="group relative bg-gray-900 text-white px-24 py-10 rounded-[3rem] font-black text-4xl shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative z-10">{spinning ? 'מסתובב...' : rounds >= maxRounds ? 'המשחק הסתיים' : 'סובב את הגלגל!'}</span>
          </button>
          
          {rounds >= maxRounds && (
            <button 
              onClick={() => onFinish(Math.round(totalScore / maxRounds))}
              className="mt-8 text-primary font-black text-2xl hover:underline"
            >
              לחץ כאן לסיום וקבלת הציון
            </button>
          )}
        </div>
      ) : (
        <div className="w-full h-full bg-white p-8 md:p-16 rounded-[4rem] shadow-2xl border border-indigo-50 flex flex-col justify-center space-y-12 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full -ml-32 -mb-32 opacity-50"></div>
          
          <div className="text-center relative z-10">
            <div className="inline-flex items-center gap-3 bg-indigo-100 text-indigo-600 px-8 py-3 rounded-full font-black text-xl mb-6 shadow-sm">
              <Sparkles size={24} />
              <span>השאלה שלך:</span>
            </div>
            <h3 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight max-w-4xl mx-auto">
              <LatexRenderer text={result!} inline />
            </h3>
          </div>

          <div className="space-y-6 flex-1 flex flex-col relative z-10">
            <textarea 
              value={studentAnswer}
              onChange={e => setStudentAnswer(e.target.value)}
              placeholder="כתוב את תשובתך כאן בצורה מפורטת..."
              className="w-full flex-1 p-6 bg-gray-50 border-4 border-gray-100 rounded-[2.5rem] font-bold text-lg md:text-2xl outline-none focus:border-primary focus:bg-white transition-all min-h-[200px] shadow-inner"
              dir="rtl"
            />
            
            {!feedback ? (
              <button 
                onClick={handleCheckAnswer}
                disabled={!studentAnswer.trim() || isChecking}
                className="w-full py-8 bg-primary text-white rounded-[2.5rem] font-black text-3xl hover:bg-blue-700 transition-all shadow-2xl flex items-center justify-center gap-6 disabled:opacity-50 active:scale-95"
              >
                {isChecking ? <Loader2 className="animate-spin" size={40} /> : <CheckCircle2 size={40} />}
                <span>{isChecking ? 'בודק תשובה...' : 'בדוק את התשובה שלי'}</span>
              </button>
            ) : (
              <div className="space-y-10 animate-fade-in">
                <div className={`p-10 rounded-[3rem] border-4 shadow-xl ${feedback.score >= 80 ? 'bg-green-50 border-green-200' : feedback.score >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${feedback.score >= 80 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        <Trophy size={40} />
                      </div>
                      <span className="font-black text-gray-900 text-4xl">ציון: {feedback.score}</span>
                    </div>
                  </div>
                  <div className="text-gray-700 font-bold text-2xl leading-relaxed bg-white/50 p-6 rounded-2xl">
                    <LatexRenderer text={feedback.feedback} />
                  </div>
                </div>
                
                <div className="flex gap-6">
                   <button 
                    onClick={() => {
                      setShowQuestion(false);
                      setResult(null);
                      setFeedback(null);
                      setStudentAnswer('');
                    }}
                    className="flex-1 py-6 bg-gray-900 text-white rounded-[2rem] font-black text-2xl hover:bg-black transition-all shadow-xl active:scale-95"
                  >
                    {rounds >= maxRounds ? 'צפה בתוצאות' : 'סובב שוב!'}
                  </button>
                  {rounds >= maxRounds && (
                    <button 
                      onClick={() => onFinish(Math.round(totalScore / maxRounds))}
                      className="flex-1 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
                    >
                      סיים משחק
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const HangmanGame: React.FC<{ content: any[]; onFinish: (score: number) => void }> = ({ content, onFinish }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  const currentItem = content[currentIdx];
  const word = currentItem.word.toUpperCase();
  const maxMistakes = 6;

  const alphabet = "אבגדהוזחטיכלמנסעפצקרשת".split("");

  const getRegularLetter = (l: string) => {
    const finalToRegular: Record<string, string> = {
      'ך': 'כ',
      'ם': 'מ',
      'ן': 'נ',
      'ף': 'פ',
      'ץ': 'צ'
    };
    return finalToRegular[l] || l;
  };

  const isWin = word.split("").every(l => guessedLetters.includes(getRegularLetter(l)) || l === " ");
  const isLoss = mistakes >= maxMistakes;

  const handleGuess = (letter: string) => {
    if (guessedLetters.includes(letter) || isWin || isLoss) return;
    setGuessedLetters([...guessedLetters, letter]);
    
    const wordHasLetter = word.split("").some(l => getRegularLetter(l) === letter);
    if (!wordHasLetter) {
      setMistakes(m => m + 1);
    }
  };

  const nextWord = () => {
    const roundScore = Math.max(0, 100 - (mistakes * 15));
    const newTotal = totalScore + (roundScore / content.length);
    
    if (currentIdx < content.length - 1) {
      setTotalScore(newTotal);
      setCurrentIdx(currentIdx + 1);
      setGuessedLetters([]);
      setMistakes(0);
    } else {
      onFinish(Math.round(newTotal));
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4 gap-4 md:gap-8">
      <div className="text-center space-y-2">
        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">מילה {currentIdx + 1} מתוך {content.length}</span>
        <div className="text-2xl md:text-4xl font-black text-indigo-600 flex items-center justify-center gap-2 flex-wrap">
          <span>רמז:</span> <LatexRenderer text={currentItem.hint} inline />
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="text-4xl md:text-7xl font-black tracking-[0.3em] text-gray-900 flex gap-4">
          {word.split("").map((l, i) => {
            const regularL = getRegularLetter(l);
            return (
              <span key={i} className="border-b-4 border-gray-200 min-w-[2rem] text-center">
                {guessedLetters.includes(regularL) || l === " " ? l : ""}
              </span>
            );
          })}
        </div>

        <div className="text-red-500 font-black text-xl">
          טעויות: {mistakes} / {maxMistakes}
        </div>
      </div>

      <div className="grid grid-cols-6 md:grid-cols-11 gap-2 md:gap-3">
        {alphabet.map(l => {
          const isGuessed = guessedLetters.includes(l);
          const isCorrect = word.split("").some(wl => getRegularLetter(wl) === l);
          return (
            <button
              key={l}
              onClick={() => handleGuess(l)}
              disabled={isGuessed || isWin || isLoss}
              className={`w-10 h-10 md:w-14 md:h-14 rounded-xl font-black text-lg md:text-2xl transition-all ${isGuessed ? (isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-400') : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600 shadow-sm hover:shadow-md'}`}
            >
              {l}
            </button>
          );
        })}
      </div>

      {(isWin || isLoss) && (
        <div className="text-center space-y-4 animate-bounce">
          <h3 className={`text-2xl font-black ${isWin ? 'text-green-500' : 'text-red-500'}`}>
            {isWin ? 'כל הכבוד! גילית את המילה' : `אופס... המילה הייתה: ${word}`}
          </h3>
          <button 
            onClick={nextWord}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all"
          >
            {currentIdx < content.length - 1 ? 'למילה הבאה' : 'סיים משחק'}
          </button>
        </div>
      )}
    </div>
  );
};

const WordSearchGame: React.FC<{ content: string[]; onFinish: (score: number) => void }> = ({ content, onFinish }) => {
  const gridSize = 10;
  const [grid, setGrid] = useState<string[][]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selection, setSelection] = useState<[number, number][]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    const newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
    const alphabet = "אבגדהוזחטיכלמנסעפצקרשת";
    
    // Place words
    const sortedWords = [...content].sort((a, b) => b.length - a.length);
    
    sortedWords.forEach(word => {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        attempts++;
        const direction = Math.random() > 0.5 ? 'H' : 'V';
        const row = Math.floor(Math.random() * (gridSize - (direction === 'V' ? word.length : 0)));
        const col = Math.floor(Math.random() * (gridSize - (direction === 'H' ? word.length : 0)));
        
        let canPlace = true;
        for (let i = 0; i < word.length; i++) {
          const r = row + (direction === 'V' ? i : 0);
          const c = col + (direction === 'H' ? i : 0);
          if (newGrid[r][c] !== '' && newGrid[r][c] !== word[i]) {
            canPlace = false;
            break;
          }
        }
        
        if (canPlace) {
          for (let i = 0; i < word.length; i++) {
            const r = row + (direction === 'V' ? i : 0);
            const c = col + (direction === 'H' ? i : 0);
            newGrid[r][c] = word[i];
          }
          placed = true;
        }
      }
    });
    
    // Fill empty
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (newGrid[r][c] === '') {
          newGrid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }
    setGrid(newGrid);
  }, [content]);

  const handleMouseDown = (r: number, c: number) => {
    setIsSelecting(true);
    setSelection([[r, c]]);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!isSelecting) return;
    
    const last = selection[selection.length - 1];
    if (last[0] === r && last[1] === c) return;
    
    // Only allow adjacent selection
    const rowDiff = Math.abs(last[0] - r);
    const colDiff = Math.abs(last[1] - c);
    
    if (rowDiff <= 1 && colDiff <= 1 && !selection.some(([sr, sc]) => sr === r && sc === c)) {
      setSelection([...selection, [r, c]]);
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    checkSelection();
  };

  const checkSelection = () => {
    const selectedWord = selection.map(([row, col]) => grid[row][col]).join('');
    const reversedWord = [...selectedWord].reverse().join('');
    
    const word = content.find(w => w === selectedWord || w === reversedWord);
    
    if (word && !foundWords.includes(word)) {
      const newFound = [...foundWords, word];
      setFoundWords(newFound);
      if (newFound.length === content.length) {
        setTimeout(() => onFinish(100), 1000);
      }
    }
    setSelection([]);
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-8 items-center justify-center p-4 select-none" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="grid grid-cols-10 gap-1 bg-white p-4 rounded-[2.5rem] border-8 border-gray-100 shadow-2xl flex-1 max-w-[85vmin]">
        {grid.map((row, r) => row.map((char, c) => {
          const isSelected = selection.some(([sr, sc]) => sr === r && sc === c);
          return (
            <div 
              key={`${r}-${c}`}
              onMouseDown={() => handleMouseDown(r, c)}
              onMouseEnter={() => handleMouseEnter(r, c)}
              className={`aspect-square rounded-xl font-black text-xl md:text-4xl flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-gray-50 text-gray-700 hover:bg-blue-50'}`}
            >
              {char}
            </div>
          );
        }))}
      </div>
      <div className="flex-1 space-y-8 w-full max-w-md bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <Search className="text-primary" size={32} />
          <h4 className="font-black text-gray-900 text-3xl">מילים למציאה</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {content.map(word => (
            <div key={word} className={`px-6 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-between ${foundWords.includes(word) ? 'bg-green-50 text-green-600 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-100 text-gray-600'}`}>
              <span>{word}</span>
              {foundWords.includes(word) && <CheckCircle2 size={20} />}
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-gray-100">
          <p className="text-gray-400 font-bold text-sm">גרור את העכבר על האותיות כדי לסמן מילה</p>
        </div>
      </div>
    </div>
  );
};

const CrosswordGame: React.FC<{ content: any[]; onFinish: (score: number) => void }> = ({ content, onFinish }) => {
  const [answers, setAnswers] = useState<string[]>(Array(content.length).fill(''));
  const [checked, setChecked] = useState<boolean[]>(Array(content.length).fill(false));
  const [results, setResults] = useState<boolean[]>(Array(content.length).fill(false));

  const handleCheckAnswer = () => {
    const newResults = answers.map((ans, idx) => ans.trim().toLowerCase() === content[idx].answer.toLowerCase());
    setResults(newResults);
    setChecked(Array(content.length).fill(true));
    
    const correctCount = newResults.filter(r => r).length;
    if (correctCount === content.length) {
      setTimeout(() => onFinish(100), 1500);
    }
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-8 items-start p-4 max-w-7xl mx-auto">
      {/* Clues Section */}
      <div className="w-full lg:w-1/3 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <HelpCircle size={28} />
            </div>
            <h4 className="text-3xl font-black text-gray-900">הגדרות</h4>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
            {content.map((item, idx) => (
              <div 
                key={idx} 
                className={`p-5 rounded-2xl border-2 transition-all ${checked[idx] ? (results[idx] ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-gray-50 border-gray-100 hover:border-indigo-200'}`}
              >
                <div className="flex items-start gap-4">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${checked[idx] ? (results[idx] ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-indigo-600 text-white'}`}>
                    {idx + 1}
                  </span>
                  <p className="font-bold text-gray-700 leading-tight pt-1">{item.clue}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="flex-1 w-full flex flex-col items-center gap-10">
        <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl border-8 border-gray-50 w-full">
          <div className="space-y-10">
            {content.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-4 animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="flex items-center gap-6">
                  <span className={`text-3xl font-black w-10 ${checked[idx] ? (results[idx] ? 'text-green-500' : 'text-red-500') : 'text-indigo-600'}`}>
                    {idx + 1}.
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {item.answer.split('').map((_: string, charIdx: number) => (
                      <input 
                        key={charIdx}
                        maxLength={1}
                        value={answers[idx][charIdx] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newAns = [...answers];
                          const current = newAns[idx].split('');
                          while(current.length < item.answer.length) current.push('');
                          current[charIdx] = val;
                          newAns[idx] = current.join('');
                          setAnswers(newAns);
                          setChecked(prev => {
                            const n = [...prev];
                            n[idx] = false;
                            return n;
                          });
                          
                          if (val && e.target.nextSibling) {
                            (e.target.nextSibling as HTMLInputElement).focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !answers[idx][charIdx] && (e.target as HTMLInputElement).previousSibling) {
                            ((e.target as HTMLInputElement).previousSibling as HTMLInputElement).focus();
                          }
                        }}
                        className={`w-10 h-10 md:w-16 md:h-16 border-4 rounded-xl text-center font-black text-xl md:text-3xl outline-none transition-all
                          ${checked[idx] 
                            ? (results[idx] ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700') 
                            : (answers[idx][charIdx] ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-gray-50 hover:border-indigo-300')}`}
                      />
                    ))}
                  </div>
                  {checked[idx] && (
                    <div className={results[idx] ? 'text-green-500' : 'text-red-500'}>
                      {results[idx] ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 w-full">
          <button 
            onClick={handleCheckAnswer}
            className="w-full max-w-md py-6 bg-primary text-white rounded-[2rem] font-black text-3xl shadow-2xl hover:bg-blue-700 transition-all transform hover:-translate-y-1 active:scale-95"
          >
            בדוק את התשובות שלי
          </button>
          <p className="text-gray-400 font-bold text-sm">השלם את כל המילים כדי לסיים את המשחק</p>
        </div>
      </div>
    </div>
  );
};

const MatchingGame: React.FC<{ content: any[]; onFinish: (score: number) => void }> = ({ content, onFinish }) => {
  const [leftItems, setLeftItems] = useState<any[]>([]);
  const [rightItems, setRightItems] = useState<any[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matches, setMatches] = useState<[number, number][]>([]);
  const [wrongMatch, setWrongMatch] = useState<[number, number] | null>(null);

  useEffect(() => {
    const left = content.map((item, idx) => ({ ...item, id: idx })).sort(() => Math.random() - 0.5);
    const right = content.map((item, idx) => ({ ...item, id: idx })).sort(() => Math.random() - 0.5);
    setLeftItems(left);
    setRightItems(right);
  }, [content]);

  const handleMatch = (leftIdx: number, rightIdx: number) => {
    const leftItem = leftItems[leftIdx];
    const rightItem = rightItems[rightIdx];

    if (leftItem.id === rightItem.id) {
      const newMatches: [number, number][] = [...matches, [leftIdx, rightIdx]];
      setMatches(newMatches);
      setSelectedLeft(null);
      setSelectedRight(null);
      if (newMatches.length === content.length) {
        setTimeout(() => onFinish(100), 1000);
      }
    } else {
      setWrongMatch([leftIdx, rightIdx]);
      setTimeout(() => {
        setWrongMatch(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 1000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-12 max-w-6xl mx-auto">
      <div className="text-center space-y-4">
        <h3 className="text-4xl md:text-6xl font-black text-gray-900">משחק התאמה</h3>
        <p className="text-gray-500 font-bold text-xl">התאם בין המושגים להגדרות שלהם</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 w-full">
        <div className="space-y-4">
          {leftItems.map((item, idx) => {
            const isMatched = matches.some(m => m[0] === idx);
            const isSelected = selectedLeft === idx;
            const isWrong = wrongMatch?.[0] === idx;
            
            return (
              <button
                key={idx}
                disabled={isMatched}
                onClick={() => {
                  if (selectedRight !== null) handleMatch(idx, selectedRight);
                  else setSelectedLeft(idx);
                }}
                className={`w-full p-6 rounded-2xl font-bold text-xl md:text-2xl transition-all border-4 text-right flex items-center justify-between
                  ${isMatched ? 'bg-green-50 border-green-200 text-green-700 opacity-50' : 
                    isWrong ? 'bg-red-50 border-red-400 text-red-700 animate-shake' :
                    isSelected ? 'bg-indigo-600 border-indigo-700 text-white scale-105 shadow-xl' : 
                    'bg-white border-gray-100 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'}`}
              >
                <LatexRenderer text={item.term || item.concept} inline />
                {isMatched && <CheckCircle2 size={24} />}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {rightItems.map((item, idx) => {
            const isMatched = matches.some(m => m[1] === idx);
            const isSelected = selectedRight === idx;
            const isWrong = wrongMatch?.[1] === idx;

            return (
              <button
                key={idx}
                disabled={isMatched}
                onClick={() => {
                  if (selectedLeft !== null) handleMatch(selectedLeft, idx);
                  else setSelectedRight(idx);
                }}
                className={`w-full p-6 rounded-2xl font-bold text-xl md:text-2xl transition-all border-4 text-right flex items-center justify-between
                  ${isMatched ? 'bg-green-50 border-green-200 text-green-700 opacity-50' : 
                    isWrong ? 'bg-red-50 border-red-400 text-red-700 animate-shake' :
                    isSelected ? 'bg-indigo-600 border-indigo-700 text-white scale-105 shadow-xl' : 
                    'bg-white border-gray-100 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'}`}
              >
                <LatexRenderer text={item.definition || item.description} inline />
                {isMatched && <CheckCircle2 size={24} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LearningGamesView;
