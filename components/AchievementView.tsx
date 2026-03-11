
import React from 'react';
import { Trophy, Flame, CheckCircle, Star, Zap, Rocket, Brain, Library, ArrowRight, Lock, Award, Medal, Target, School } from 'lucide-react';
import { User, HistoryItem, Subject, Badge } from '../types.ts';

interface AchievementViewProps {
  user: User;
  history: HistoryItem[];
  onBack: () => void;
}

const AchievementView: React.FC<AchievementViewProps> = ({ user, history, onBack }) => {
  const totalQuestions = user.totalQuestionsSolved || 0;
  const streak = user.streak || 0;
  const uniqueSubjects = new Set(history.map(h => h.subject)).size;
  
  // Logic for unique classrooms
  const joinedClassrooms = new Set(history.filter(h => h.classId).map(h => h.classId)).size;
  
  // Logic for counting tests with score 100
  const perfectTests = history.filter(h => h.score === 100).length;

  const BADGES: Badge[] = [
    {
      id: 'q-10',
      title: 'מתחיל נחוש',
      description: 'פתרת 10 שאלות ראשונות!',
      icon: 'Rocket',
      targetValue: 10,
      currentValue: totalQuestions,
      progress: Math.min(100, Math.round((totalQuestions / 10) * 100)),
      unlocked: totalQuestions >= 10
    },
    {
      id: 'class-explorer',
      title: 'סייר כיתות',
      description: 'הצטרפת ולקחת חלק ב-3 כיתות!',
      icon: 'School',
      targetValue: 3,
      currentValue: joinedClassrooms,
      progress: Math.min(100, Math.round((joinedClassrooms / 3) * 100)),
      unlocked: joinedClassrooms >= 3
    },
    {
      id: 'perfect-3',
      title: 'שלמות היא לא מילה גסה',
      description: 'קיבלת 100 בשלושה מבחנים!',
      icon: 'Target',
      targetValue: 3,
      currentValue: perfectTests,
      progress: Math.min(100, Math.round((perfectTests / 3) * 100)),
      unlocked: perfectTests >= 3
    },
    {
      id: 'q-50',
      title: 'חוקר מתקדם',
      description: 'הגעת ל-50 שאלות. מרשים!',
      icon: 'Zap',
      targetValue: 50,
      currentValue: totalQuestions,
      progress: Math.min(100, Math.round((totalQuestions / 50) * 100)),
      unlocked: totalQuestions >= 50
    },
    {
      id: 'q-100',
      title: 'מאסטר הידע',
      description: '100 שאלות! אתה פשוט תותח.',
      icon: 'Award',
      targetValue: 100,
      currentValue: totalQuestions,
      progress: Math.min(100, Math.round((totalQuestions / 100) * 100)),
      unlocked: totalQuestions >= 100
    },
    {
      id: 'streak-3',
      title: 'מתמיד צעיר',
      description: 'שלושה ימי למידה רצופים.',
      icon: 'Flame',
      targetValue: 3,
      currentValue: streak,
      progress: Math.min(100, Math.round((streak / 3) * 100)),
      unlocked: streak >= 3
    },
    {
      id: 'streak-7',
      title: 'לוחם רצף',
      description: 'שבוע שלם של למידה יומיומית!',
      icon: 'Medal',
      targetValue: 7,
      currentValue: streak,
      progress: Math.min(100, Math.round((streak / 7) * 100)),
      unlocked: streak >= 7
    },
    {
      id: 'subjects-3',
      title: 'חוקר עולמות',
      description: 'תרגלת ב-3 מקצועות שונים.',
      icon: 'Library',
      targetValue: 3,
      currentValue: uniqueSubjects,
      progress: Math.min(100, Math.round((uniqueSubjects / 3) * 100)),
      unlocked: uniqueSubjects >= 3
    },
    {
      id: 'subjects-8',
      title: 'איש אשכולות',
      description: 'נגעת בכל המקצועות הקיימים!',
      icon: 'Star',
      targetValue: 8,
      currentValue: uniqueSubjects,
      progress: Math.min(100, Math.round((uniqueSubjects / 8) * 100)),
      unlocked: uniqueSubjects >= 8
    }
  ];

  const getIcon = (iconName: string, unlocked: boolean) => {
    const size = 32;
    const color = unlocked ? 'text-yellow-500' : 'text-gray-300';
    switch (iconName) {
      case 'Rocket': return <Rocket size={size} className={color} />;
      case 'Zap': return <Zap size={size} className={color} />;
      case 'Award': return <Award size={size} className={color} />;
      case 'Flame': return <Flame size={size} className={color} />;
      case 'Medal': return <Medal size={size} className={color} />;
      case 'Library': return <Library size={size} className={color} />;
      case 'Star': return <Star size={size} className={color} />;
      case 'Target': return <Target size={size} className={color} />;
      case 'School': return <School size={size} className={color} />;
      default: return <Trophy size={size} className={color} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in pb-20 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={onBack} className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm transition-colors">
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-3xl font-black text-gray-900">ההישגים שלי</h2>
          <p className="text-gray-500 font-bold">כל הדרך שעשית עד עכשיו</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-[3rem] -z-0 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-orange-100 p-5 rounded-3xl text-orange-600 mb-4 flex items-center justify-center w-20 h-20">
              <Flame size={40} />
            </div>
            <div className="text-4xl font-black text-gray-900 mb-1">{streak}</div>
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">ימי רצף למידה</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[3rem] -z-0 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-blue-100 p-5 rounded-3xl text-blue-600 mb-4 flex items-center justify-center w-20 h-20">
              <CheckCircle size={40} />
            </div>
            <div className="text-4xl font-black text-gray-900 mb-1">{totalQuestions}</div>
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">שאלות שנפתרו</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-[3rem] -z-0 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10 flex flex-col items-center justify-center w-full">
            <div className="bg-purple-100 p-5 rounded-3xl text-purple-600 mb-4 flex items-center justify-center w-20 h-20 mx-auto">
              <Brain size={40} />
            </div>
            <div className="text-4xl font-black text-gray-900 mb-1">{uniqueSubjects}</div>
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest">מקצועות שתרגלת</div>
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-black text-gray-800 mb-8 px-2">תגי כבוד</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {BADGES.map((badge) => {
          const progressPercent = badge.progress;
          return (
            <div key={badge.id} className={`bg-white p-6 rounded-[2rem] border-2 transition-all duration-500 flex flex-col ${badge.unlocked ? 'border-yellow-200 shadow-lg scale-100' : 'border-gray-50 opacity-60 grayscale scale-95 shadow-none'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${badge.unlocked ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                  {getIcon(badge.icon, badge.unlocked)}
                </div>
                {!badge.unlocked && <Lock size={16} className="text-gray-300 mt-2" />}
                {badge.unlocked && <div className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">פתוח</div>}
              </div>
              <h4 className="text-xl font-black text-gray-800 mb-1">{badge.title}</h4>
              <p className="text-sm text-gray-500 font-bold mb-6">{badge.description}</p>
              
              <div className="mt-auto">
                <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase mb-2">
                  <span>התקדמות</span>
                  <span>{progressPercent}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${badge.unlocked ? 'bg-yellow-400' : 'bg-blue-400'}`} 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-bold">{badge.currentValue} / {badge.targetValue}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementView;
