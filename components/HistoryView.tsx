
import React, { useState } from 'react';
import { HistoryItem, HistoryAnalysis } from '../types.ts';
import { analyzeHistory } from '../services/geminiService.ts';
import LatexRenderer from './LatexRenderer.tsx';
import { Trash2, CheckCircle, XCircle, Clock, ArrowRight, BrainCircuit, Sparkles, Target, TrendingUp, TrendingDown, Loader2, FileText, ChevronLeft, Award } from 'lucide-react';

interface HistoryViewProps {
  history: HistoryItem[];
  onBack: () => void;
  onOpenSummary: (item: HistoryItem) => void;
  isTeacher?: boolean;
  onDeleteItem?: (id: string) => void;
  onDeleteAll?: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onBack, onOpenSummary, isTeacher, onDeleteItem, onDeleteAll }) => {
  const [analysis, setAnalysis] = useState<HistoryAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const practiceHistory = history.filter(h => h.type === 'PRACTICE');
  const summaryHistory = history.filter(h => h.type === 'SUMMARY');

  const correctCount = practiceHistory.filter(h => h.isCorrect).length;
  // If there are practices, calculate normally. If no practices but has summaries, show 100%. Else 0.
  const successRate = practiceHistory.length > 0 
    ? Math.round((correctCount / practiceHistory.length) * 100) 
    : (history.length > 0 ? 100 : 0);
  
  const subjectCounts = history.reduce((acc, curr) => {
    acc[curr.subject] = (acc[curr.subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Use itemA and itemB to avoid generic names that might collide or cause scope issues
  const mostCommonSubject = Object.entries(subjectCounts).sort((itemA, itemB) => (itemB[1] as number) - (itemA[1] as number))[0]?.[0] || '-';

  const [showMinHistoryError, setShowMinHistoryError] = useState(false);

  const handleAnalyze = async () => {
    if (history.length < 3) {
      setShowMinHistoryError(true);
      setTimeout(() => setShowMinHistoryError(false), 3000);
      return;
    }
    setLoadingAnalysis(true);
    try {
        const result = await analyzeHistory(history);
        setAnalysis(result);
    } catch (e) {
        console.error("Analysis failed", e);
    } finally {
        setLoadingAnalysis(false);
    }
  };

  return (
    <div className="w-full mx-auto p-4 md:p-8 animate-fade-in flex flex-col min-h-[60vh]" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors shadow-sm"
          >
            <ArrowRight size={20} className="text-gray-600" />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">היסטוריית פעילות</h2>
            <p className="text-gray-500">מעקב אחר כל מה שלמדת ותרגלת</p>
          </div>
        </div>
        
        {history.length > 0 && !isTeacher && (
           <div className="flex flex-col items-end gap-2">
             <div className="flex gap-3">
               <button 
                  onClick={onDeleteAll}
                  className="flex items-center justify-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold border border-red-100 hover:bg-red-100 transition-all"
               >
                  <Trash2 size={20} />
                  <span>מחק הכל</span>
               </button>
               <button 
                  onClick={handleAnalyze}
                  disabled={loadingAnalysis}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-indigo-200 transition-all transform hover:-translate-y-1 disabled:opacity-70"
               >
                  {loadingAnalysis ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  <span>{loadingAnalysis ? 'מנתח נתונים...' : 'נתח את הלמידה שלי (AI)'}</span>
               </button>
             </div>
             {showMinHistoryError && (
               <p className="text-xs font-bold text-red-500 animate-fade-in">אנא צבור לפחות 3 פריטים בהיסטוריה כדי לקבל ניתוח.</p>
             )}
           </div>
        )}
      </div>

      {/* AI Analysis Result */}
      {analysis && (
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-white border border-indigo-100 rounded-3xl p-6 md:p-8 mb-8 shadow-sm animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -ml-16 -mt-16 pointer-events-none"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4 text-indigo-800">
                    <BrainCircuit size={28} />
                    <h3 className="text-xl font-bold">דוח יועץ חכם</h3>
                </div>
                
                <div className="text-lg text-gray-700 leading-relaxed mb-6">
                    <LatexRenderer text={analysis.insight} />
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-indigo-100 shadow-sm">
                        <div className="flex items-center gap-2 text-green-600 font-bold mb-2">
                            <TrendingUp size={20} />
                            <span>נקודת חוזק</span>
                        </div>
                        <div className="text-gray-800 text-sm">
                            <LatexRenderer text={analysis.strength || "המשך לתרגל כדי לגלות נקודות חוזק!"} />
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-indigo-100 shadow-sm">
                         <div className="flex items-center gap-2 text-red-500 font-bold mb-2">
                            <TrendingDown size={20} />
                            <span>נקודת לשיפור</span>
                        </div>
                        <div className="text-gray-800 text-sm">
                            <LatexRenderer text={analysis.weakness || "לא נמצאו נקודות חולשה בולטות - כל הכבוד!"} />
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-indigo-100 shadow-sm">
                         <div className="flex items-center gap-2 text-blue-600 font-bold mb-2">
                            <Target size={20} />
                            <span>המלצות למידה</span>
                        </div>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                            {analysis.recommendations?.map((rec, idx) => (
                                <li key={idx}>
                                    <LatexRenderer text={rec} className="inline" />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Quick Stats */}
      {history.length > 0 && (
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="text-gray-500 text-xs mb-1">סה"כ פריטים</div>
                <div className="text-2xl font-bold text-gray-800">{history.length}</div>
            </div>
            {!isTeacher && (
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <div className="text-gray-500 text-xs mb-1">אחוז הצלחה בתרגול</div>
                    <div className={`text-2xl font-bold ${successRate >= 80 ? 'text-green-500' : successRate >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {successRate}
                    </div>
                </div>
            )}
             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="text-gray-500 text-xs mb-1">סיכומים שנוצרו</div>
                <div className="text-2xl font-bold text-blue-600">{summaryHistory.length}</div>
            </div>
             <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="text-gray-500 text-xs mb-1">נושא עיקרי</div>
                <div className="text-lg font-bold text-blue-600 truncate px-2">{mostCommonSubject}</div>
            </div>
         </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-200 w-full max-w-none flex flex-col items-center justify-center px-4">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="text-gray-400" size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">עדיין אין פעילות</h3>
          <p className="text-gray-500 mb-6">התחל ללמוד או לתרגל כדי לראות את ההיסטוריה שלך כאן</p>
          <button onClick={onBack} className="text-primary font-bold hover:underline">
              חזור ללמידה
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-gray-50/50 text-gray-500 text-sm font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5 whitespace-nowrap first:rounded-tr-3xl">תאריך</th>
                  <th className="px-6 py-5 whitespace-nowrap">סוג</th>
                  <th className="px-6 py-5 whitespace-nowrap">מקצוע</th>
                  <th className="px-6 py-5 whitespace-nowrap">נושא / שאלה</th>
                  <th className="px-6 py-5 whitespace-nowrap text-center last:rounded-tl-3xl">פעולה / סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.slice().reverse().map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-800">
                        {new Date(item.timestamp).toLocaleDateString('he-IL')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(item.timestamp).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       {item.type === 'SUMMARY' ? (
                         <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1 rounded-full w-fit">
                           <FileText size={14} />
                           <span>סיכום</span>
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 text-purple-600 font-bold text-xs bg-purple-50 px-3 py-1 rounded-full w-fit">
                           <Sparkles size={14} />
                           <span>תרגול</span>
                         </div>
                       )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-600 px-2 py-1 rounded-full text-xs font-bold">
                            {item.subject}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 line-clamp-2 md:line-clamp-1 group-hover:line-clamp-none transition-all max-w-[200px] md:max-w-md overflow-x-auto">
                            <LatexRenderer text={item.title} />
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-4">
                        {item.type === 'SUMMARY' ? (
                          <button 
                            onClick={() => onOpenSummary(item)}
                            className="flex items-center gap-1 text-primary hover:text-blue-700 font-black text-xs transition-colors"
                          >
                            <span>צפה בסיכום</span>
                            <ChevronLeft size={16} />
                          </button>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm mx-auto
                              ${item.isCorrect ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                              {item.isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />}
                              {item.isCorrect ? 'נכון' : 'שגוי'}
                            </div>
                            {item.score !== undefined && (
                              <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1">
                                <Award size={10} />
                                <span>ציון: {item.score}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <button 
                          onClick={() => onDeleteItem && onDeleteItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="מחק"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
