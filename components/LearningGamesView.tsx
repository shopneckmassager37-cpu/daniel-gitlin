
import React, { useState, useEffect, useMemo } from 'react';
import { Subject, Grade, User, HistoryItem, LearningGame, GameType, GameScore } from '../types.ts';
import { dbService } from '../services/dbService.ts';
import { 
  Gamepad2, Trophy, History as HistoryIcon, Play, 
  RotateCcw, ChevronLeft, ArrowRight, Star, 
  Dices, Target, HelpCircle, Brain, 
  Search, Trash2, Plus, Users, Crown,
  Clock, CheckCircle2, XCircle, Sparkles
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
      if (isTeacher) {
        dbService.saveGame(newGame).catch(err => console.error("Failed to save game to Supabase:", err));
        setGames(prev => [newGame, ...prev]);
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
      timestamp: Date.now()
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

  if (activeGame) {
    return (
      <GameRunner
        game={activeGame}
        onFinish={(score, timeSeconds) => {
          saveGameResult(activeGame, score, timeSeconds);
          setActiveGame(null);
        }}
        onCancel={() => setActiveGame(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in text-right" dir="rtl">
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
              onBack();
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

      {view === 'SELECT_TYPE' ? (
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
                      onClick={() => setActiveGame(games.find(g => g.id === item.gameId) || null)}
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
      {recommendedGames.length > 0 && (
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
    : "bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 min-h-[600px] flex flex-col w-full";

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
      <div className="flex-1 min-h-0 overflow-auto">
        {renderGame()}
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

  useEffect(() => {
    setLeftItems([...content].sort(() => Math.random() - 0.5));
    setRightItems([...content].sort(() => Math.random() - 0.5));
  }, [content]);

  const handleMatch = (lIdx: number, rIdx: number) => {
    if (leftItems[lIdx].id === rightItems[rIdx].id) {
      const newMatches: [number, number][] = [...matches, [lIdx, rIdx]];
      setMatches(newMatches);
      if (newMatches.length === content.length) {
        setTimeout(() => onFinish(100), 1000);
      }
    }
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-4 md:gap-8 items-stretch justify-center p-2 md:p-4">
      <div className="flex-1 space-y-3 flex flex-col">
        <h4 className="text-center font-black text-gray-400 mb-2 uppercase tracking-widest text-xs">מושגים</h4>
        <div className="flex-1 flex flex-col gap-3">
          {leftItems.map((item, idx) => (
            <button 
              key={idx}
              disabled={matches.some(m => m[0] === idx)}
              onClick={() => {
                setSelectedLeft(idx);
                if (selectedRight !== null) handleMatch(idx, selectedRight);
              }}
              className={`flex-1 w-full p-3 rounded-2xl font-black text-sm md:text-lg transition-all border-2 ${matches.some(m => m[0] === idx) ? 'bg-green-50 border-green-200 text-green-300' : selectedLeft === idx ? 'bg-primary border-primary text-white shadow-lg scale-[1.02]' : 'bg-white border-gray-100 hover:border-primary/30'}`}
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-3 flex flex-col">
        <h4 className="text-center font-black text-gray-400 mb-2 uppercase tracking-widest text-xs">התאמות</h4>
        <div className="flex-1 flex flex-col gap-3">
          {rightItems.map((item, idx) => (
            <button 
              key={idx}
              disabled={matches.some(m => m[1] === idx)}
              onClick={() => {
                setSelectedRight(idx);
                if (selectedLeft !== null) handleMatch(selectedLeft, idx);
              }}
              className={`flex-1 w-full p-3 rounded-2xl font-black text-sm md:text-lg transition-all border-2 ${matches.some(m => m[1] === idx) ? 'bg-green-50 border-green-200 text-green-300' : selectedRight === idx ? 'bg-primary border-primary text-white shadow-lg scale-[1.02]' : 'bg-white border-gray-100 hover:border-primary/30'}`}
            >
              {item.match}
            </button>
          ))}
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
  const [showMatchMessage, setShowMatchMessage] = useState(false);

  useEffect(() => {
    const deck = [...content.map(i => ({ id: i.id, text: i.text, type: 'Q' })), ...content.map(i => ({ id: i.id, text: i.match, type: 'A' }))];
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
        setShowMatchMessage(true);
        setTimeout(() => {
          setMatched([...matched, first, second]);
          setFlipped([]);
          setShowMatchMessage(false);
          if (matched.length + 2 === cards.length) {
            setTimeout(() => onFinish(Math.max(10, 100 - moves * 5)), 1000);
          }
        }, 1000);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="bg-indigo-50 px-6 py-2 rounded-full text-indigo-600 font-black text-sm">מהלכים: {moves}</div>
        <div className="bg-green-50 px-6 py-2 rounded-full text-green-600 font-black text-sm">זוגות: {matched.length / 2} / {content.length}</div>
      </div>
      
      {showMatchMessage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-green-500 text-white px-10 py-5 rounded-3xl font-black text-3xl shadow-2xl animate-bounce">
            כל הכבוד! מצאת זוג! 🌟
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 flex-1 items-stretch">
        {cards.map((card, idx) => {
          const isMatched = matched.includes(idx);
          const isFlipped = flipped.includes(idx);
          
          if (isMatched) return <div key={idx} className="aspect-square opacity-0" />;

          return (
            <div 
              key={idx} 
              onClick={() => handleFlip(idx)}
              className={`aspect-square rounded-3xl flex items-center justify-center text-center p-6 cursor-pointer transition-all duration-500 preserve-3d shadow-2xl ${isFlipped ? 'bg-white border-8 border-indigo-500 scale-105' : 'bg-indigo-600 text-white hover:scale-105 active:scale-95'}`}
            >
              {isFlipped ? (
                <span className="font-black text-indigo-900 text-lg md:text-3xl">{card.text}</span>
              ) : (
                <Brain size={64} className="opacity-50" />
              )}
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
    if (correct && Math.random() > 0.7) {
      setShowBonus(true);
      points += 10; // Bonus points
    }
    
    if (correct) setScore(s => s + points);

    setTimeout(() => {
      setShowBonus(false);
      if (currentIdx < content.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setSelected(null);
        setIsCorrect(null);
      } else {
        onFinish(Math.round(score + (correct ? points : 0)));
      }
    }, 1500);
  };

  const q = content[currentIdx];

  return (
    <div className="w-full h-full bg-slate-900 p-2 md:p-4 flex flex-col relative overflow-auto">
      {/* TV Scanlines effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
      
      <div className="relative z-20 flex-1 flex flex-col justify-center">
        <div className="flex justify-between items-center mb-4">
          <div className="bg-indigo-600/20 px-6 py-2 rounded-full border border-indigo-500/30">
            <span className="text-indigo-400 font-black text-xs uppercase tracking-widest">שאלה {currentIdx + 1} / {content.length}</span>
          </div>
          <div className="bg-amber-500/20 px-6 py-2 rounded-full border border-amber-500/30">
            <span className="text-amber-400 font-black text-xs uppercase tracking-widest">נקודות: {Math.round(score)}</span>
          </div>
        </div>

        <div className="text-center mb-6 md:mb-10">
          <h3 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-[0_0_20px_rgba(99,102,241,0.6)]">
            <LatexRenderer text={q.question} />
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {q.options.map((opt: string, idx: number) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              className={`p-4 md:p-8 rounded-2xl font-black text-base md:text-2xl transition-all border-4 text-right flex items-center gap-4 group
                ${selected === idx
                  ? (isCorrect ? 'bg-green-500 border-green-400 text-white shadow-[0_0_50px_rgba(34,197,94,0.7)] scale-105' : 'bg-red-500 border-red-400 text-white shadow-[0_0_50px_rgba(239,68,68,0.7)] scale-95')
                  : selected !== null && idx === q.correct
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500 hover:bg-slate-700 hover:text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:scale-[1.02]'
                }`}
            >
              <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0 font-black text-lg md:text-2xl
                ${selected === idx ? 'bg-white/20' : 'bg-slate-700 group-hover:bg-indigo-600'}`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="flex-1"><LatexRenderer text={opt} /></span>
            </button>
          ))}
        </div>

        {showBonus && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-ping">
            <div className="bg-amber-500 text-white px-6 py-3 rounded-full font-black text-xl shadow-2xl border-2 border-white">
              בונוס! 🌟 +10
            </div>
          </div>
        )}

        {isCorrect !== null && (
          <div className={`mt-6 text-center animate-bounce font-black text-xl drop-shadow-lg ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect ? 'נכון מאוד! 🎊' : 'אופס... לא נכון ❌'}
          </div>
        )}
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
    <div className="flex flex-col items-center w-full h-full p-2 justify-center">
      {!showQuestion ? (
        <>
          <div className="relative w-[55vmin] h-[55vmin] mb-6 md:mb-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-6 z-20">
              <div className="w-8 h-10 bg-gray-900 clip-path-needle shadow-lg"></div>
              <style>{`.clip-path-needle { clip-path: polygon(50% 100%, 0 0, 100% 0); }`}</style>
            </div>
            
            <div 
              className="w-full h-full rounded-full border-[16px] border-gray-900 shadow-[0_0_60px_rgba(0,0,0,0.3)] overflow-hidden transition-transform duration-[3000ms] cubic-bezier(0.15, 0, 0.15, 1) relative bg-gray-900"
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
                      <path d={pathData} fill={colors[idx % colors.length]} stroke="#000" strokeWidth="0.2" />
                      <g transform={`rotate(${startAngle + angle / 2} 50 50)`}>
                        <text 
                          x="50" y="20" 
                          fill="white" 
                          fontSize="4" 
                          fontWeight="900" 
                          textAnchor="middle" 
                          transform="rotate(0 50 20)"
                          className="select-none"
                        >
                          {((item.text || item).toString().length > 15) ? (item.text || item).toString().substring(0, 12) + '...' : (item.text || item)}
                        </text>
                      </g>
                    </g>
                  );
                })}
                <circle cx="50" cy="50" r="8" fill="#111" stroke="#333" strokeWidth="1" />
                <circle cx="50" cy="50" r="3" fill="#fff" />
              </svg>
            </div>
          </div>

          <button 
            onClick={spin}
            disabled={spinning}
            className="group relative bg-gray-900 text-white px-10 py-5 rounded-[2rem] font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative z-10">{spinning ? 'מסתובב...' : 'סובב את הגלגל!'}</span>
          </button>
        </>
      ) : (
        <div className="w-full h-full bg-white p-4 md:p-8 rounded-[2rem] shadow-2xl border border-indigo-100 flex flex-col justify-center space-y-4 animate-fade-in overflow-y-auto">
          <div className="text-center">
            <div className="inline-block bg-indigo-100 text-indigo-600 px-6 py-2 rounded-full font-black text-base mb-4">השאלה שלך:</div>
            <h3 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight">
              <LatexRenderer text={result!} />
            </h3>
          </div>

          <div className="space-y-4 flex flex-col">
            <textarea
              value={studentAnswer}
              onChange={e => setStudentAnswer(e.target.value)}
              placeholder="כתוב את תשובתך כאן..."
              className="w-full p-4 md:p-6 bg-gray-50 border-4 border-gray-100 rounded-2xl font-bold text-base md:text-xl outline-none focus:border-primary transition-all min-h-[120px]"
            />
            
            {!feedback ? (
              <button 
                onClick={handleCheckAnswer}
                disabled={!studentAnswer.trim() || isChecking}
                className="w-full py-3 bg-primary text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isChecking ? <RotateCcw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                <span>{isChecking ? 'בודק תשובה...' : 'בדוק את התשובה שלי'}</span>
              </button>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className={`p-4 rounded-2xl border-2 ${feedback.score >= 80 ? 'bg-green-50 border-green-200' : feedback.score >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Trophy className={feedback.score >= 80 ? 'text-green-500' : 'text-amber-500'} size={24} />
                      <span className="font-black text-gray-900 text-xl">ציון: {feedback.score}</span>
                    </div>
                  </div>
                  <p className="text-gray-700 font-bold text-sm leading-relaxed">
                    <LatexRenderer text={feedback.feedback} />
                  </p>
                </div>
                
                <div className="flex gap-4">
                   <button 
                    onClick={() => {
                      setShowQuestion(false);
                      setResult(null);
                      setFeedback(null);
                      setStudentAnswer('');
                    }}
                    className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-black hover:bg-black transition-all"
                  >
                    סובב שוב!
                  </button>
                  <button 
                    onClick={() => onFinish(feedback.score)}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all"
                  >
                    סיים משחק
                  </button>
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

  const isWin = word.split("").every(l => guessedLetters.includes(l) || l === " ");
  const isLoss = mistakes >= maxMistakes;

  const handleGuess = (letter: string) => {
    if (guessedLetters.includes(letter) || isWin || isLoss) return;
    setGuessedLetters([...guessedLetters, letter]);
    if (!word.includes(letter)) {
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
    <div className="w-full h-full flex flex-col items-center justify-center p-2 gap-4 md:gap-8">
      <div className="text-center space-y-2">
        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">מילה {currentIdx + 1} מתוך {content.length}</span>
        <h4 className="text-xl md:text-3xl font-black text-indigo-600">רמז: {currentItem.hint}</h4>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="text-3xl md:text-5xl font-black tracking-[0.3em] text-gray-900 flex gap-3 flex-wrap justify-center">
          {word.split("").map((l, i) => (
            <span key={i} className="border-b-4 border-gray-200 min-w-[2rem] text-center">
              {guessedLetters.includes(l) || l === " " ? l : ""}
            </span>
          ))}
        </div>

        <div className="text-red-500 font-black text-3xl">
          טעויות: {mistakes} / {maxMistakes}
        </div>
      </div>

      <div className="grid grid-cols-6 md:grid-cols-11 gap-3 md:gap-4">
        {alphabet.map(l => (
          <button
            key={l}
            onClick={() => handleGuess(l)}
            disabled={guessedLetters.includes(l) || isWin || isLoss}
            className={`w-10 h-10 md:w-14 md:h-14 rounded-xl font-black text-lg md:text-2xl transition-all ${guessedLetters.includes(l) ? (word.includes(l) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-400') : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600 shadow-md'}`}
          >
            {l}
          </button>
        ))}
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

  useEffect(() => {
    const newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
    const alphabet = "אבגדהוזחטיכלמנסעפצקרשת";
    
    // Place words
    content.forEach(word => {
      let placed = false;
      while (!placed) {
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

  const handleCellClick = (r: number, c: number) => {
    const newSelection = [...selection, [r, c] as [number, number]];
    setSelection(newSelection);
    
    const selectedWord = newSelection.map(([row, col]) => grid[row][col]).join('');
    const reversedWord = [...selectedWord].reverse().join('');
    
    if (content.includes(selectedWord) || content.includes(reversedWord)) {
      const word = content.includes(selectedWord) ? selectedWord : reversedWord;
      if (!foundWords.includes(word)) {
        const newFound = [...foundWords, word];
        setFoundWords(newFound);
        setSelection([]);
        if (newFound.length === content.length) {
          setTimeout(() => onFinish(100), 1000);
        }
      }
    } else if (newSelection.length > 8) {
      setSelection([]);
    }
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-4 items-center justify-center p-2">
      <div className="grid grid-cols-10 gap-1 bg-gray-100 p-2 rounded-2xl border-4 border-gray-200 shadow-xl flex-1 max-w-[90vmin]">
        {grid.map((row, r) => row.map((char, c) => (
          <button 
            key={`${r}-${c}`}
            onClick={() => handleCellClick(r, c)}
            className={`aspect-square rounded-lg font-black text-lg md:text-3xl flex items-center justify-center transition-all ${selection.some(([row, col]) => row === r && col === c) ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-white text-gray-700 hover:bg-blue-50'}`}
          >
            {char}
          </button>
        )))}
      </div>
      <div className="flex-1 space-y-6 w-full max-w-md">
        <h4 className="font-black text-gray-900 text-2xl">מילים למציאה:</h4>
        <div className="flex flex-wrap gap-2">
          {content.map(word => (
            <span key={word} className={`px-4 py-2 rounded-xl font-black text-sm md:text-lg transition-all ${foundWords.includes(word) ? 'bg-green-100 text-green-600 line-through opacity-50' : 'bg-white border-2 border-gray-100 text-gray-600 shadow-sm'}`}>
              {word}
            </span>
          ))}
        </div>
        <button onClick={() => setSelection([])} className="text-sm font-black text-primary hover:underline bg-blue-50 px-4 py-2 rounded-full">נקה בחירה</button>
      </div>
    </div>
  );
};

const CrosswordGame: React.FC<{ content: any[]; onFinish: (score: number) => void }> = ({ content, onFinish }) => {
  const [answers, setAnswers] = useState<string[]>(Array(content.length).fill(''));
  const [showFeedback, setShowFeedback] = useState(false);

  const handleCheckAnswer = () => {
    const correctCount = answers.filter((ans, idx) => ans.trim().toLowerCase() === content[idx].answer.toLowerCase()).length;
    if (correctCount === content.length) {
      onFinish(100);
    } else {
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-4 items-start p-3 overflow-auto">
      {/* Clues Section */}
      <div className="w-full md:w-1/4 space-y-3">
        <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl">
          <h4 className="text-lg font-black mb-3 flex items-center gap-2">
            <HelpCircle size={20} />
            <span>הגדרות</span>
          </h4>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {content.map((item, idx) => (
              <div key={idx} className="bg-white/10 p-2 rounded-xl border border-white/20">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center text-xs font-black shrink-0">{idx + 1}</span>
                  <span className="font-bold text-xs">{item.clue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="flex-1 w-full flex flex-col items-center justify-start gap-4">
        <div className="bg-white p-3 md:p-6 rounded-2xl shadow-xl border-4 border-gray-50 w-full">
          <div className="grid gap-4 md:gap-6">
            {content.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-indigo-600 font-black text-xl w-8">{idx + 1}.</span>
                  <div className="flex gap-2 flex-wrap">
                    {item.answer.split('').map((_: string, charIdx: number) => (
                      <div key={charIdx} className="relative group">
                        <input
                          maxLength={1}
                          value={answers[idx][charIdx] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newAns = [...answers];
                            const current = newAns[idx].split('');
                            current[charIdx] = val;
                            newAns[idx] = current.join('');
                            setAnswers(newAns);

                            // Auto-focus next input
                            if (val && e.target.nextSibling) {
                              (e.target.nextSibling as HTMLInputElement).focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !answers[idx][charIdx] && (e.target as HTMLInputElement).previousSibling) {
                              ((e.target as HTMLInputElement).previousSibling as HTMLInputElement).focus();
                            }
                          }}
                          className={`w-10 h-10 md:w-14 md:h-14 border-2 md:border-4 rounded-xl text-center font-black text-lg md:text-2xl outline-none transition-all
                            ${answers[idx][charIdx] ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-gray-50 hover:border-indigo-300'}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleCheckAnswer}
            className="px-10 py-3 bg-primary text-white rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all transform hover:-translate-y-1"
          >
            בדוק את התשובות שלי
          </button>
          {showFeedback && (
            <div className="flex items-center gap-3 text-red-500 font-black animate-shake bg-red-50 px-8 py-4 rounded-full border-2 border-red-100 text-lg">
              <XCircle size={24} />
              <span>חלק מהתשובות אינן נכונות, נסה שוב!</span>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default LearningGamesView;
