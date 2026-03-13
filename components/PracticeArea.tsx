import React, { useState, useEffect } from 'react';
import { Subject, Grade, Question, PracticeConfig, MaterialType, UserSettings, User } from '../types.ts';
import { generateQuestions, gradeOpenQuestion, generateExamFeedback } from '../services/geminiService.ts';
import LatexRenderer from './LatexRenderer.tsx';
import { 
  Play, CheckCircle, XCircle, ChevronLeft, Lightbulb, MessageCircleQuestion, 
  Clock, BrainCircuit, FileText, Settings2, RotateCcw, Timer, 
  Trophy, ArrowRight, Loader2, Award, Info, Sparkles, UserPlus, Paperclip, X
} from 'lucide-react';

interface PracticeAreaProps {
  subject: Subject;
  grade: Grade;
  onQuestionAnswered: (question: Question, isCorrect: boolean) => void;
  onMultipleQuestionsAnswered?: (results: { question: Question, isCorrect: boolean }[]) => void;
  onAssignToClass?: (item: { title: string, content: string, questions: Question[], type: MaterialType }) => void;
  onAskAI?: (questionText: string) => void;
  onBack?: () => void;
  initialConfig?: PracticeConfig | null;
  recentMistakes: string[];
  isTeacher?: boolean;
  userSettings?: UserSettings;
  user?: User | null;
  isPro?: boolean;
  checkAndIncrementAiLimit?: (type: 'PRACTICE' | 'SUMMARY' | 'CHAT' | 'TEST_PREP') => boolean;
}

const LOADING_MESSAGES = [
  "מייצר שאלות תרגול...",
  "מנתח את נושא הלימוד...",
  "בונה את המשימה...",
  "מארגן את חומרי הלמידה...",
  "מעבד את הנתונים..."
];

const PracticeArea: React.FC<PracticeAreaProps> = ({ 
  subject, 
  grade, 
  onQuestionAnswered, 
  onMultipleQuestionsAnswered,
  onAssignToClass, 
  onAskAI,
  onBack,
  initialConfig, 
  recentMistakes,
  isTeacher,
  userSettings,
  user,
  isPro,
  checkAndIncrementAiLimit
}) => {
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'MEDIUM' | 'HARD'>('MEDIUM');
  const [mode, setMode] = useState<'PRACTICE' | 'TEST'>(isTeacher ? 'TEST' : 'PRACTICE');
  const [attachment, setAttachment] = useState<{file: File, preview: string} | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [questions, setQuestions] = useState<Question[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment({
          file: file,
          preview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({}); 
  const [openQuestionFeedback, setOpenQuestionFeedback] = useState<Record<number, { score: number; feedback: string }>>({});
  const [isAnswerChecked, setIsAnswerChecked] = useState(false); 
  const [showSummary, setShowSummary] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const playFeedback = (isCorrect: boolean) => {
    if (!userSettings?.soundEffects) return;
    
    try {
      // Use basic browser synth/audio as a generic placeholder for sound assets
      const synth = window.speechSynthesis;
      if (synth) {
         const utterance = new SpeechSynthesisUtterance(isCorrect ? "נכון מאוד" : "לא בדיוק");
         utterance.lang = 'he-IL';
         utterance.rate = 1.2;
         synth.speak(utterance);
      }
    } catch (e) {
      console.warn("Sound playback failed", e);
    }
  };

  useEffect(() => {
    if (initialConfig) {
      setTopic(initialConfig.topic || '');
      setQuestionCount(initialConfig.count);
      setMode(initialConfig.mode);
      setDifficulty(initialConfig.difficulty);
      handleGenerate(initialConfig.topic || undefined, initialConfig.count, initialConfig.difficulty);
    }
  }, [initialConfig]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingMsgIndex(0);
      interval = setInterval(() => {
         setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (questions.length > 0 && !showSummary && !loading) {
        const interval = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        setTimerInterval(interval);
        return () => clearInterval(interval);
    } else {
        if (timerInterval) clearInterval(timerInterval);
    }
  }, [questions.length, showSummary, loading]);

  const handleGenerate = async (
    overrideTopic?: string, 
    overrideCount?: number, 
    overrideDifficulty?: 'MEDIUM' | 'HARD'
  ) => {
    setLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setUserAnswers({});
    setOpenQuestionFeedback({});
    setIsAnswerChecked(false);
    setShowSummary(false);
    setElapsedTime(0);
    
    const targetTopic = overrideTopic !== undefined ? overrideTopic : topic;
    const targetCount = overrideCount || questionCount;
    const targetDiff = overrideDifficulty || difficulty;

    // Check AI limit
    if (checkAndIncrementAiLimit && !checkAndIncrementAiLimit('PRACTICE')) {
      alert("הגעת למכסת יצור התרגולים היומיים שלך. נסה שוב מחר!");
      setLoading(false);
      return;
    }

    const shouldUsePersonalized = recentMistakes.length > 0 && !targetTopic;

    let attachmentData = undefined;
    if (attachment) {
      const base64Data = attachment.preview.split(',')[1];
      attachmentData = {
        mimeType: attachment.file.type,
        data: base64Data
      };
    }

    try {
      const newQuestions = await generateQuestions(
          subject, 
          grade, 
          targetTopic || "נושא כללי", 
          shouldUsePersonalized ? recentMistakes : undefined,
          targetCount,
          targetDiff,
          undefined,
          undefined,
          undefined,
          user?.learningProfile,
          attachmentData
      );
      
      if (newQuestions && newQuestions.length > 0) {
        setQuestions(newQuestions);
      } else {
        alert("לא הצלחנו לייצר שאלות. אנא נסה נושא אחר או נסה שוב מאוחר יותר.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (val: any) => {
    if (showSummary) return;
    if (mode === 'PRACTICE' && isAnswerChecked) return;

    setUserAnswers(prev => ({
        ...prev,
        [currentIndex]: val
    }));
  };

  const handleCheckPracticeAnswer = async () => {
    const currentQ = questions[currentIndex];
    const answer = userAnswers[currentIndex];
    if (answer === undefined || answer === '') return;
    
    let isCorrectForStats = false;

    if (currentQ.type === 'OPEN') {
      setIsGrading(true);
      try {
        const attachmentData = attachment ? { 
          mimeType: attachment.file.type, 
          data: attachment.preview.split(',')[1] 
        } : undefined;
        const result = await gradeOpenQuestion(currentQ.text, currentQ.modelAnswer || "", answer, attachmentData);
        setOpenQuestionFeedback(prev => ({ ...prev, [currentIndex]: result }));
        isCorrectForStats = result.score >= 50; 
      } catch (e) {
        console.error(e);
        isCorrectForStats = true; 
      } finally {
        setIsGrading(false);
      }
    } else {
      isCorrectForStats = answer === currentQ.correctIndex;
    }

    setIsAnswerChecked(true);
    playFeedback(isCorrectForStats);
    onQuestionAnswered(currentQ, isCorrectForStats);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      if (mode === 'PRACTICE') {
          setIsAnswerChecked(false);
      }
    } else {
        finishTest();
    }
  };

  const finishTest = async () => {
    if (mode === 'TEST') {
      setIsGrading(true);
      const attachmentData = attachment ? { 
        mimeType: attachment.file.type, 
        data: attachment.preview.split(',')[1] 
      } : undefined;
      const gradingPromises = questions.map(async (q, idx) => {
        if (q.type === 'OPEN' && userAnswers[idx]) {
          const result = await gradeOpenQuestion(q.text, q.modelAnswer || "", userAnswers[idx], attachmentData);
          return { idx, result };
        }
        return null;
      });

      const results = await Promise.all(gradingPromises);
      const newFeedback = { ...openQuestionFeedback };
      const batchResults: { question: Question, isCorrect: boolean }[] = [];
      
      results.forEach(res => {
        if (res) {
          newFeedback[res.idx] = res.result;
          batchResults.push({ question: questions[res.idx], isCorrect: res.result.score >= 50 });
        }
      });

      setOpenQuestionFeedback(newFeedback);
      
      questions.forEach((q, idx) => {
        if (q.type !== 'OPEN') {
          const answer = userAnswers[idx];
          if (answer !== undefined) {
            const correct = answer === q.correctIndex;
            batchResults.push({ question: q, isCorrect: correct });
          }
        }
      });

      if (onMultipleQuestionsAnswered && batchResults.length > 0) {
        onMultipleQuestionsAnswered(batchResults);
      } else if (batchResults.length > 0) {
        batchResults.forEach(res => onQuestionAnswered(res.question, res.isCorrect));
      }

      setIsGrading(false);
    }
    setShowSummary(true);
    
    // Generate AI feedback for the final score
    const totalScorePoints = questions.reduce((acc, q, idx) => {
        if (q.type === 'OPEN') {
          return acc + (openQuestionFeedback[idx]?.score || 0);
        }
        return acc + (userAnswers[idx] === q.correctIndex ? 100 : 0);
    }, 0);
    const score = Math.round(totalScorePoints / questions.length);
    
    try {
      const feedback = await generateExamFeedback(score, subject, grade);
      setAiFeedback(feedback);
    } catch (e) {
      console.error("Failed to generate AI feedback", e);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetAll = () => {
      setQuestions([]);
      setTopic('');
      setElapsedTime(0);
      setUserAnswers({});
      setOpenQuestionFeedback({});
      setCurrentIndex(0);
      setShowSummary(false);
      setIsAnswerChecked(false);
      if (onBack) onBack();
  };

  const handleAssignQuestions = () => {
      if (onAssignToClass) {
          onAssignToClass({
              title: `מבחן/תרגול בנושא ${topic || 'כללי'}`,
              content: `תרגול שאלות שהופק על ידי AI בנושא ${topic || 'כללי'}`,
              questions: questions,
              type: 'TEST'
          });
      }
  };

  if (loading) {
    return (
      <div className="bg-white md:rounded-[2.5rem] shadow-lg p-8 md:p-12 text-center max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
         <div className="relative mb-8">
            <div className={`absolute inset-0 rounded-full animate-ping opacity-25 bg-blue-100`}></div>
            <div className={`relative p-6 rounded-full bg-blue-50`}>
                {mode === 'TEST' ? <FileText className="animate-pulse text-indigo-600" size={48} /> : <BrainCircuit className="animate-pulse text-primary" size={48} />}
            </div>
         </div>
         <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{mode === 'TEST' ? 'בונה את המבחן...' : `מייצר תרגול בנושא: ${topic || 'כללי'}`}</h3>
         <div className="h-8 mb-6 flex items-center justify-center">
            <p className="text-gray-500 font-medium animate-fade-in transition-all duration-500 text-base md:text-lg text-center px-4">{LOADING_MESSAGES[loadingMsgIndex]}</p>
         </div>
      </div>
    );
  }

  if (showSummary) {
    const totalScorePoints = questions.reduce((acc, q, idx) => {
        if (q.type === 'OPEN') {
          return acc + (openQuestionFeedback[idx]?.score || 0);
        }
        return acc + (userAnswers[idx] === q.correctIndex ? 100 : 0);
    }, 0);
    const score = Math.round(totalScorePoints / questions.length);

    return (
      <div className="max-w-4xl mx-auto animate-fade-in space-y-8 pb-12">
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
            <div className="bg-gray-900 p-10 md:p-12 text-center text-white relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10">
                    <div className="bg-white/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                        <Trophy size={40} className="text-yellow-400" />
                    </div>
                    <h2 className="text-4xl font-black mb-2">סיכום המבחן</h2>
                    <p className="text-gray-400 font-bold">כל הכבוד על המאמץ!</p>
                </div>
            </div>

            <div className="p-8 md:p-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-gray-50 p-6 rounded-3xl text-center border border-gray-100 flex flex-col justify-center">
                        <div className={`text-5xl font-black mb-1 ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{score}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">ציון סופי</div>
                    </div>
                    <div className="md:col-span-2 bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4">
                        <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">משוב מהמורה הדיגיטלי</div>
                            <p className="text-gray-700 font-bold text-lg leading-relaxed">
                                {aiFeedback || "מנתח את הביצועים שלך..."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        <FileText size={20} className="text-primary" />
                        <span>פירוט שאלות ותשובות</span>
                    </h3>
                    
                    <div className="space-y-4">
                        {questions.map((q, idx) => {
                            const userAnswer = userAnswers[idx];
                            const isCorrect = q.type === 'OPEN' 
                                ? (openQuestionFeedback[idx]?.score || 0) >= 60
                                : userAnswer === q.correctIndex;
                            
                            return (
                                <div key={idx} className={`p-6 rounded-2xl border-2 transition-all ${isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 p-1.5 rounded-full shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {isCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="font-bold text-gray-800 text-lg">
                                                <span className="ml-2 text-gray-400">#{idx + 1}</span>
                                                <LatexRenderer text={q.text} />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div className="p-3 rounded-xl bg-white border border-gray-100">
                                                    <span className="block text-[10px] font-black text-gray-400 uppercase mb-1">התשובה שלך:</span>
                                                    <div className={isCorrect ? 'text-green-700 font-bold' : 'text-red-600 font-bold'}>
                                                        {q.type === 'OPEN' ? (userAnswer || 'לא נענה') : (userAnswer !== undefined ? q.options[userAnswer] : 'לא נענה')}
                                                    </div>
                                                </div>
                                                {!isCorrect && (
                                                    <div className="p-3 rounded-xl bg-white border border-green-100">
                                                        <span className="block text-[10px] font-black text-green-400 uppercase mb-1">התשובה הנכונה:</span>
                                                        <div className="text-green-700 font-bold">
                                                            {q.type === 'OPEN' ? <LatexRenderer text={q.modelAnswer || ''} /> : q.options[q.correctIndex]}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-4 bg-white/50 rounded-xl border border-gray-100 text-sm leading-relaxed">
                                                <div className="flex items-center gap-2 mb-1 text-primary font-black text-[10px] uppercase">
                                                    <Lightbulb size={12} />
                                                    <span>הסבר לימודי:</span>
                                                </div>
                                                <div className="text-gray-600">
                                                    {q.type === 'OPEN' && openQuestionFeedback[idx]?.feedback ? (
                                                        <p className="mb-2 font-bold text-blue-700">{openQuestionFeedback[idx].feedback}</p>
                                                    ) : null}
                                                    <LatexRenderer text={q.explanation} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-10">
                    <button 
                        onClick={() => handleGenerate()} 
                        className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                    >
                        <RotateCcw size={22} />
                        <span>תרגול נוסף</span>
                    </button>
                    <button 
                        onClick={resetAll} 
                        className="flex-1 bg-white text-gray-700 border-2 border-gray-200 py-4 rounded-2xl font-black text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                    >
                        <ArrowRight size={22} />
                        <span>חזרה לתפריט</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="bg-white rounded-[3rem] shadow-xl p-10 md:p-16 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-50 rounded-full -ml-12 -mb-12 opacity-50" />
          
          <div className="text-center mb-12 relative">
             <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-sm rotate-3"><Settings2 size={40} /></div>
             <h3 className="text-4xl font-black text-gray-900 mb-3">{isTeacher ? 'הכנת תוכה כיתתי' : 'הגדרת תרגול'}</h3>
             <p className="text-gray-500 font-medium text-lg">{isTeacher ? 'הזן נושא לייצור שאלות ותוכן עבור התלמידים' : 'התאם את חווית הלמידה שלך'}</p>
          </div>
          
          <div className="space-y-10">
             <div className="bg-gray-50/50 p-8 rounded-[2rem] border-2 border-dashed border-gray-100">
                <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-widest">{isTeacher ? 'נושא התוכן לכיתה' : 'על מה נתרגל היום?'}</label>
                <div className="flex gap-3">
                   <input 
                     type="text" 
                     value={topic} 
                     onChange={(e) => setTopic(e.target.value)} 
                     placeholder="לדוגמה: שברים, המהפכה הצרפתית..." 
                     className="flex-1 p-5 bg-white border-2 border-gray-100 rounded-2xl focus:border-primary outline-none transition-all text-lg font-medium" 
                   />
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-center shadow-sm ${attachment ? 'border-primary bg-blue-50 text-primary' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}
                     title="צרף קובץ (תמונה)"
                   >
                     <Paperclip size={28} />
                   </button>
                   <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                </div>
                {attachment && (
                  <div className="mt-4 flex items-center gap-4 p-3 bg-blue-50 rounded-2xl border border-blue-100 animate-slide-up">
                     <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white shadow-sm">
                       <img src={attachment.preview} alt="preview" className="w-full h-full object-cover" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">קובץ מצורף</p>
                       <p className="text-sm font-bold text-blue-900 truncate">{attachment.file.name}</p>
                     </div>
                     <button onClick={removeAttachment} className="p-2 text-blue-400 hover:text-red-500 transition-colors">
                       <X size={20} />
                     </button>
                  </div>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               {!isTeacher && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-widest">סוג הפעילות</label>
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => setMode('PRACTICE')} className={`p-6 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-2 ${mode === 'PRACTICE' ? 'border-primary bg-blue-50 text-primary shadow-md' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                           <BrainCircuit size={28} />
                           <div className="font-black">תרגול רגיל</div>
                       </button>
                       <button onClick={() => setMode('TEST')} className={`p-6 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-2 ${mode === 'TEST' ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-md' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                           <FileText size={28} />
                           <div className="font-black">מצב מבחן</div>
                       </button>
                    </div>
                  </div>
               )}

               <div>
                  <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-widest">מספר שאלות</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[5, 10, 15, 20].map((count) => (
                      <button
                        key={count}
                        onClick={() => setQuestionCount(count)}
                        className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${questionCount === count ? 'bg-primary text-white border-primary shadow-lg shadow-blue-200' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
               </div>
               
               <div>
                  <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-widest">רמת קושי</label>
                  <div className="flex gap-4">
                      <button onClick={() => setDifficulty('MEDIUM')} className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${difficulty === 'MEDIUM' ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-2' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>רגיל</button>
                      <button onClick={() => setDifficulty('HARD')} className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${difficulty === 'HARD' ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-2' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>מתקדם</button>
                  </div>
               </div>
             </div>

             <button onClick={() => handleGenerate()} disabled={isTeacher && !topic.trim()} className="w-full bg-gray-900 text-white py-6 rounded-2xl font-black text-xl shadow-2xl hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-30 active:scale-95">
                {isTeacher ? <Sparkles size={28} className="text-yellow-400" /> : <Play size={28} />} 
                {isTeacher ? 'ייצר מערך שאלות עם AI' : `התחל ${mode === 'TEST' ? 'מבחן' : 'תרגול'}`}
             </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const currentOpenFeedback = openQuestionFeedback[currentIndex];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gray-50 p-4 flex justify-between items-center border-b border-gray-200">
            <div className="flex items-center gap-4">
                <span className="font-bold text-gray-700">{isTeacher ? 'סקירת תוכן לייצור' : (mode === 'TEST' ? 'מבחן' : 'תרגול')}</span>
                {(mode === 'TEST' && !isTeacher) && <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm text-indigo-600 font-mono font-bold"><Timer size={16} />{formatTime(elapsedTime)}</div>}
            </div>
            <div className="text-sm font-bold text-gray-500">שאלה {currentIndex + 1} / {questions.length}</div>
        </div>
        <div className="h-1.5 bg-gray-100 w-full"><div className={`h-full transition-all duration-500 ${isTeacher ? 'bg-indigo-500' : (mode === 'TEST' ? 'bg-indigo-500' : 'bg-primary')}`} style={{ width: `${progress}%` }} /></div>
        <div className="p-8 md:p-14">
          <div className="text-2xl md:text-3xl font-black text-gray-900 mb-10 leading-relaxed text-center"><LatexRenderer text={currentQ.text} /></div>
          
          <div className="mb-10">
            {currentQ.type === 'OPEN' ? (
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest text-right">{isTeacher ? 'תצוגה מקדימה למקום תשובה:' : 'התשובה שלך:'}</label>
                <textarea
                  value={userAnswers[currentIndex] || ''}
                  onChange={(e) => handleSelectAnswer(e.target.value)}
                  disabled={((mode === 'PRACTICE' && isAnswerChecked) || isGrading) && !isTeacher}
                  placeholder={isTeacher ? "הזן תשובה לדוגמה כדי לבדוק את הדיוק של ה-AI" : "הקלד כאן את הפתרון שלך..."}
                  className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none transition-all min-h-[160px] text-right font-medium text-lg shadow-inner"
                />
                {isGrading && mode === 'PRACTICE' && (
                  <div className="flex items-center gap-2 text-primary font-bold animate-pulse justify-center py-2">
                    <Loader2 size={18} className="animate-spin" />
                    <span>המורה הדיגיטלי בודק את תשובתך...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {currentQ.options.map((option, idx) => {
                  let btnClass = "border-2 border-gray-200 hover:bg-gray-50";
                  const isSelected = userAnswers[currentIndex] === idx;
                  
                  if (mode === 'PRACTICE' && isAnswerChecked) {
                     if (idx === currentQ.correctIndex) btnClass = "border-green-500 bg-green-50 text-green-700";
                     else if (isSelected) btnClass = "border-red-500 bg-red-50 text-red-800";
                     else btnClass = "border-gray-100 text-gray-400 opacity-60";
                  } else if (isSelected) {
                     btnClass = "border-primary bg-blue-50 text-primary ring-1 ring-primary";
                  }

                  return (
                    <button key={idx} onClick={() => handleSelectAnswer(idx)} className={`w-full p-5 rounded-2xl text-right transition-all duration-200 font-bold text-lg ${btnClass}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 ${(mode === 'PRACTICE' && isAnswerChecked && idx === currentQ.correctIndex) || (isSelected && (mode === 'TEST' || !isAnswerChecked)) ? 'border-transparent bg-primary text-white' : (mode === 'PRACTICE' && isAnswerChecked && isSelected && idx !== currentQ.correctIndex) ? 'border-red-50 bg-red-500 text-white' : 'border-current'}`}>{idx + 1}</div>
                        <LatexRenderer text={option} inline />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {mode === 'PRACTICE' && isAnswerChecked && (
            <div className={`mb-8 p-8 rounded-[2.5rem] border-2 animate-fade-in shadow-lg ${currentQ.type === 'OPEN' ? (currentOpenFeedback?.score && currentOpenFeedback.score >= 80 ? 'bg-green-50 border-green-200' : currentOpenFeedback?.score && currentOpenFeedback.score >= 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200') : (userAnswers[currentIndex] === currentQ.correctIndex ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}`}>
              <div className="flex items-start gap-6">
                <div className={`p-4 rounded-2xl shrink-0 shadow-sm ${currentQ.type === 'OPEN' ? (currentOpenFeedback?.score && currentOpenFeedback.score >= 80 ? 'bg-green-100 text-green-600' : currentOpenFeedback?.score && currentOpenFeedback.score >= 40 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600') : (userAnswers[currentIndex] === currentQ.correctIndex ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600')}`}>
                    {currentQ.type === 'OPEN' ? <Award size={24} /> : <Lightbulb size={24} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <p className={`font-black text-lg ${currentQ.type === 'OPEN' ? (currentOpenFeedback?.score && currentOpenFeedback.score >= 80 ? 'text-green-800' : currentOpenFeedback?.score && currentOpenFeedback.score >= 40 ? 'text-yellow-800' : 'text-red-800') : (userAnswers[currentIndex] === currentQ.correctIndex ? 'text-green-800' : 'text-red-800')}`}>
                        {currentQ.type === 'OPEN' ? (currentOpenFeedback?.score && currentOpenFeedback.score >= 80 ? 'מצוין!' : currentOpenFeedback?.score && currentOpenFeedback.score >= 40 ? 'כמעט מדויק' : 'דורש שיפור') : (userAnswers[currentIndex] === currentQ.correctIndex ? 'נכון מאוד!' : 'לא בדיוק...')}
                    </p>
                    {currentQ.type === 'OPEN' && (
                        <div className={`px-3 py-1 rounded-full font-black text-sm shadow-sm ${currentOpenFeedback?.score && currentOpenFeedback.score >= 80 ? 'bg-green-500 text-white' : currentOpenFeedback?.score && currentOpenFeedback.score >= 40 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                            {currentOpenFeedback?.score}
                        </div>
                    )}
                  </div>
                  
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    {currentQ.type === 'OPEN' && (
                      <>
                        <div className="p-4 bg-white/80 rounded-xl border border-blue-100 shadow-sm font-bold text-sm">
                           <span className="text-gray-400 block mb-1 uppercase tracking-tighter text-[10px]">הערות המורה:</span>
                           {currentOpenFeedback?.feedback || "בודק..."}
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
                          <span className="text-gray-400 block mb-1 uppercase tracking-tighter text-[10px]">תשובה מצופה:</span>
                          <LatexRenderer text={currentQ.modelAnswer || ""} />
                        </div>
                      </>
                    )}
                    <div className="text-sm opacity-80 pt-2 border-t border-current/10">
                        <span className="font-bold">הסבר פתרון: </span>
                        <LatexRenderer text={currentQ.explanation} inline className="inline" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100">
             <button onClick={resetAll} className="text-gray-400 hover:text-gray-600 text-sm font-medium hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">צא מהתרגול</button>
             <div className="flex gap-3">
                {onAskAI && (
                   <button 
                     onClick={() => onAskAI(`השאלה: ${currentQ.text}\n${currentQ.type === 'MCQ' ? `אפשרויות: ${currentQ.options.join(', ')}` : `התשובה שלי: ${userAnswers[currentIndex]}`}\nאני צריך עזרה להבין את זה.`)} 
                     className="p-3 text-accent hover:bg-purple-50 rounded-xl transition-colors" 
                     title="התייעץ עם המורה"
                   >
                     <MessageCircleQuestion size={24} />
                   </button>
                )}
                {isTeacher && onAssignToClass && (
                   <button 
                    onClick={handleAssignQuestions}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md flex items-center gap-2"
                   >
                     <UserPlus size={20} />
                     <span>שייך לכיתה</span>
                   </button>
                )}
                {mode === 'PRACTICE' && !isAnswerChecked ? (
                  <button onClick={handleCheckPracticeAnswer} disabled={(!userAnswers[currentIndex] && userAnswers[currentIndex] !== 0) || isGrading} className="bg-primary hover:bg-blue-600 disabled:bg-gray-300 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-md flex items-center gap-2">
                    {isGrading && <Loader2 size={18} className="animate-spin" />}
                    <span>בדוק תשובה</span>
                  </button>
                ) : (
                  <button onClick={handleNext} disabled={(userAnswers[currentIndex] === undefined || userAnswers[currentIndex] === '') && mode === 'TEST'} className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-md">
                    {currentIndex === questions.length - 1 ? 'סיים והגש' : 'הבא'}
                    <ChevronLeft size={18} />
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeArea;