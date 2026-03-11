
import React, { useState, useEffect, useRef } from 'react';
import { Subject, Grade, TestPrepPlan, Flashcard, ConceptLink, Question, User } from '../types.ts';
import { generateTestPrepPlan, gradeOpenQuestion } from '../services/geminiService.ts';
import LatexRenderer from './LatexRenderer.tsx';
import { 
  Calendar, Sparkles, Play, CheckCircle, 
  ArrowRight, Youtube, Clock, 
  ChevronLeft, BookOpen, Paperclip, X, FileText, 
  Layers, Map as MapIcon, Rotate3d, Lightbulb, 
  Hash, ArrowDown, RotateCcw, Plus, Award,
  Timer, Loader2, MessageCircleQuestion, Trophy
} from 'lucide-react';

interface TestPrepViewProps {
  subject: Subject | string;
  grade: Grade;
  initialData?: { topic: string, days: number, attachment?: any } | null;
  onClearInitialData?: () => void;
  isTeacher?: boolean;
  user?: User | null;
  checkAndIncrementAiLimit?: (type: 'PRACTICE' | 'SUMMARY' | 'CHAT' | 'TEST_PREP') => boolean;
  onQuestionAnswered?: (question: Question, isCorrect: boolean) => void;
  onMultipleQuestionsAnswered?: (results: { question: Question, isCorrect: boolean }[]) => void;
  isGeneratingExternal?: boolean;
  onStartGenerationExternal?: (subject: string, grade: Grade, topic: string, days: number, attachment?: any) => void;
}

const FlashcardComp: React.FC<{ card: Flashcard, index: number }> = ({ card, index }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    return (
        <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="group h-56 w-full perspective-1000 cursor-pointer animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            <div className={`relative h-full w-full transition-all duration-700 preserve-3d shadow-xl rounded-[2rem] ${isFlipped ? 'rotate-y-180' : ''}`}>
                <div className="absolute inset-0 backface-hidden bg-white rounded-[2rem] border-2 border-blue-50 flex flex-col items-center justify-center p-8 text-center shadow-sm group-hover:shadow-blue-100 transition-all">
                    <div className="absolute top-4 left-4 bg-blue-50 text-blue-500 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black">{index + 1}</div>
                    <div className="bg-blue-50/50 p-3 rounded-2xl mb-4 text-blue-500 group-hover:scale-110 transition-transform"><Hash size={20} /></div>
                    <div className="text-xl font-black text-gray-800 leading-tight"><LatexRenderer text={card.front} /></div>
                    <div className="mt-6 text-gray-400 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full"><Rotate3d size={12} /> לחץ להפיכה</div>
                </div>
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex flex-col items-center justify-center p-8 text-center shadow-2xl text-white overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl"></div>
                    <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-4 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">הסבר מפורט</span>
                    <div className="text-lg font-medium leading-relaxed"><LatexRenderer text={card.back} /></div>
                </div>
            </div>
        </div>
    );
};

const ConceptMapVisual: React.FC<{ links: ConceptLink[] }> = ({ links }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
            {links?.slice(0, 4).map((link, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[2.5rem] border-2 border-emerald-50 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                    <div className="flex flex-col gap-4">
                        <div className="bg-emerald-50/50 p-4 rounded-2xl text-center">
                            <span className="block text-[10px] text-emerald-500 font-black uppercase mb-1 tracking-widest">נושא</span>
                            <span className="text-lg font-black text-gray-800"><LatexRenderer text={link.from} /></span>
                        </div>
                        
                        <div className="flex flex-col items-center py-1">
                            <div className="bg-emerald-600 text-white px-4 py-1 rounded-full text-[10px] font-black shadow-lg shadow-emerald-200/50 z-10 whitespace-nowrap uppercase tracking-tighter">
                                {link.relation}
                            </div>
                            <div className="h-6 w-0.5 bg-emerald-100"></div>
                        </div>

                        <div className="bg-indigo-50/50 p-4 rounded-2xl text-center">
                            <span className="block text-[10px] text-indigo-500 font-black uppercase mb-1 tracking-widest">תוצאה / קשר</span>
                            <span className="text-lg font-black text-gray-800"><LatexRenderer text={link.to} /></span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

const TestPrepView: React.FC<TestPrepViewProps> = ({ 
  subject, grade, initialData, onClearInitialData, isTeacher, user, 
  checkAndIncrementAiLimit, onQuestionAnswered, onMultipleQuestionsAnswered,
  isGeneratingExternal, onStartGenerationExternal 
}) => {
  const [topicInput, setTopicInput] = useState('');
  const [daysCount, setDaysCount] = useState(3);
  const [activePlan, setActivePlan] = useState<TestPrepPlan | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'CONTENT' | 'INTERACTIVE' | 'QUIZ'>('CONTENT');
  const [loading, setLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, any>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGrading, setIsGrading] = useState(false);
  const [openQuestionFeedback, setOpenQuestionFeedback] = useState<Record<number, { score: number; feedback: string }>>({});
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{file: File, name: string, data: string, mimeType: string} | null>(null);

  const savePlan = (plan: TestPrepPlan | null) => {
    const storageKey = `test_prep_${subject}`;
    if (plan) {
      setActivePlan(plan);
      localStorage.setItem(storageKey, JSON.stringify(plan));
    } else {
      localStorage.removeItem(storageKey);
      setActivePlan(null);
      setActiveDay(null);
      setTopicInput('');
      setDaysCount(3);
      setAttachment(null);
      setQuizFinished(false);
      setQuizAnswers({});
      setCurrentIndex(0);
      setIsAnswerChecked(false);
      setElapsedTime(0);
      setOpenQuestionFeedback({});
      setActiveSubTab('CONTENT');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreatePlan = async (overrideTopic?: string, overrideDays?: number, overrideAttachment?: any) => {
    const finalTopic = overrideTopic || topicInput;
    const finalDays = overrideDays || daysCount;
    if (!finalTopic.trim() && !attachment && !overrideAttachment) return;
    
    if (checkAndIncrementAiLimit && !checkAndIncrementAiLimit('TEST_PREP')) {
      alert("הגעת למכסת הכנות למבחן השבועיות שלך. נסה שוב בשבוע הבא!");
      return;
    }

    const attachmentData = overrideAttachment || (attachment ? { mimeType: attachment.mimeType, data: attachment.data } : undefined);
    
    if (onStartGenerationExternal) {
      onStartGenerationExternal(subject, grade as Grade, finalTopic, finalDays, attachmentData);
      return;
    }

    setLoading(true);
    
    try {
        const plan = await generateTestPrepPlan(subject, grade, finalTopic, finalDays, attachmentData, user?.learningProfile);
        if (plan) {
          savePlan(plan);
        } else {
          alert("מצטערים, חלה שגיאה בבניית התוכנית. נסה שוב עם נושא אחר.");
        }
    } catch (e) {
        console.error("Error creating plan", e);
        alert("מצטערים, חלה שגיאה בלתי צפויה.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(`test_prep_${subject}`);
    if (saved) {
      try {
        setActivePlan(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load plan", e);
      }
    } else {
      setActivePlan(null);
    }
  }, [subject, isGeneratingExternal]);

  useEffect(() => {
    if (initialData) {
        setTopicInput(initialData.topic);
        setDaysCount(initialData.days);
        handleCreatePlan(initialData.topic, initialData.days, initialData.attachment);
        if (onClearInitialData) onClearInitialData();
    }
  }, [initialData]);

  useEffect(() => {
    if (activeDay !== null && activePlan && activeSubTab === 'QUIZ' && !quizFinished && !loading) {
        const interval = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        setTimerInterval(interval);
        return () => clearInterval(interval);
    } else {
        if (timerInterval) clearInterval(timerInterval);
    }
  }, [activeDay, activePlan, activeSubTab, quizFinished, loading]);

  const handleSelectAnswer = (val: any) => {
    if (quizFinished) return;
    if (isAnswerChecked) return;

    setQuizAnswers(prev => ({
        ...prev,
        [currentIndex]: val
    }));
  };

  const handleCheckPracticeAnswer = async (questions: Question[]) => {
    const currentQ = questions[currentIndex];
    const answer = quizAnswers[currentIndex];
    if (answer === undefined || answer === '') return;
    
    if (currentQ.type === 'OPEN') {
      if (checkAndIncrementAiLimit && !checkAndIncrementAiLimit('CHAT')) {
        alert("הגעת למכסת הודעות ה-AI היומיות שלך. נסה שוב מחר!");
        return;
      }
      setIsGrading(true);
      try {
        const result = await gradeOpenQuestion(currentQ.text, currentQ.modelAnswer || "", answer);
        setOpenQuestionFeedback(prev => ({ ...prev, [currentIndex]: result }));
        if (onQuestionAnswered) onQuestionAnswered(currentQ, result.score >= 50);
      } catch (e) {
        console.error(e);
      } finally {
        setIsGrading(false);
      }
    } else {
      if (onQuestionAnswered) onQuestionAnswered(currentQ, answer === currentQ.correctIndex);
    }

    setIsAnswerChecked(true);
  };

  const handleNext = (questions: Question[]) => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsAnswerChecked(false);
    } else {
        finishTest(questions);
    }
  };

  const finishTest = async (questions: Question[]) => {
    const openQuestionsCount = questions.filter(q => q.type === 'OPEN' && quizAnswers[questions.indexOf(q)]).length;
    
    if (checkAndIncrementAiLimit && user?.subscriptionType !== 'Pro' && user?.role === 'TEACHER') {
      const needed = openQuestionsCount;
      const current = user.aiRequestsToday || 0;
      if (current + needed > 10) {
         alert("הגעת למכסת הבקשות היומית שלך. נסה שוב מחר!");
         return;
      }
    }

    setIsGrading(true);
    const gradingPromises = questions.map(async (q, idx) => {
      if (q.type === 'OPEN' && quizAnswers[idx]) {
        const result = await gradeOpenQuestion(q.text, q.modelAnswer || "", quizAnswers[idx]);
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

    questions.forEach((q, idx) => {
      if (q.type !== 'OPEN') {
        const answer = quizAnswers[idx];
        if (answer !== undefined) {
          batchResults.push({ question: q, isCorrect: answer === q.correctIndex });
        }
      }
    });

    if (onMultipleQuestionsAnswered && batchResults.length > 0) {
      onMultipleQuestionsAnswered(batchResults);
    } else if (onQuestionAnswered && batchResults.length > 0) {
      batchResults.forEach(res => onQuestionAnswered(res.question, res.isCorrect));
    }

    setOpenQuestionFeedback(newFeedback);
    setIsGrading(false);
    setQuizFinished(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setAttachment({ file: file, name: file.name, data: base64Data, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCompleteDay = (dayNum: number) => {
    if (!activePlan) return;
    const newCompleted = activePlan.completedDays.includes(dayNum) ? activePlan.completedDays : [...activePlan.completedDays, dayNum];
    
    if (newCompleted.length === activePlan.totalDays) {
      alert("כל הכבוד! סיימת את כל תוכנית ההכנה למבחן. התוכנית תושלם ותימחק כעת.");
      savePlan(null);
    } else {
      const updated = { ...activePlan, completedDays: newCompleted };
      savePlan(updated);
      setActiveDay(null);
      setQuizFinished(false);
      setQuizAnswers({});
      setCurrentIndex(0);
      setIsAnswerChecked(false);
      setElapsedTime(0);
      setOpenQuestionFeedback({});
    }
  };

  const isCurrentlyLoading = loading || isGeneratingExternal;

  if (isCurrentlyLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] shadow-sm min-h-[400px] text-center border border-gray-100">
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-25"></div>
          <div className="relative p-8 bg-blue-50 rounded-full shadow-inner"><Sparkles className="text-primary animate-pulse" size={64} /></div>
        </div>
        <h3 className="text-3xl font-black text-gray-900 mb-2">בונה תוכנית הכנה...</h3>
        <p className="text-gray-700 font-bold mb-4 text-xl">מנתח את חומרי הלימוד...</p>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
            הבינה המלאכותית מכינה לך מערך הכנה מקיף הכולל סיכומים, תרגול ומושגים.
        </p>
      </div>
    );
  }

  if (activeDay !== null && activePlan) {
    const day = activePlan.days?.find(d => d.dayNumber === activeDay);
    if (!day) return null;

    return (
      <div className="animate-fade-in space-y-8 pb-20 max-w-6xl mx-auto">
        <button onClick={() => {setActiveDay(null); setActiveSubTab('CONTENT');}} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-all font-bold group"><div className="bg-white p-2 rounded-full border border-gray-200 group-hover:border-primary group-hover:text-primary transition-all"><ArrowRight size={20} /></div>חזרה לתוכנית האישית</button>
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
          <div className="bg-gray-900 text-white p-10 md:p-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div><span className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block shadow-lg">יחידת למידה {day.dayNumber} מתוך {activePlan.totalDays}</span><h2 className="text-4xl md:text-5xl font-black">{day.title}</h2></div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    <button onClick={() => setActiveSubTab('CONTENT')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-3 shrink-0 ${activeSubTab === 'CONTENT' ? 'bg-white text-gray-900 shadow-xl' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}><BookOpen size={20} /><span>תוכן היחידה</span></button>
                    <button onClick={() => setActiveSubTab('INTERACTIVE')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-3 shrink-0 ${activeSubTab === 'INTERACTIVE' ? 'bg-white text-gray-900 shadow-xl' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}><Layers size={20} /><span>עזרים ויזואליים</span></button>
                    <button onClick={() => setActiveSubTab('QUIZ')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-3 shrink-0 ${activeSubTab === 'QUIZ' ? 'bg-white text-gray-900 shadow-xl' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}><FileText size={20} /><span>מבחן בדיקה</span></button>
                </div>
            </div>
          </div>
          <div className="p-8 md:p-14 bg-gray-50/30">
            {activeSubTab === 'CONTENT' && (
              <section className="animate-fade-in space-y-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-4"><div className="flex items-center gap-4"><div className="bg-blue-100 p-3 rounded-2xl text-blue-600 shadow-sm"><BookOpen size={28} /></div><div><h3 className="text-2xl font-black text-gray-900">סיכום החומר</h3><p className="text-sm text-gray-500">קרא בעיון את הדגשים החשובים ליום זה</p></div></div></div>
                <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-xl border border-gray-100 leading-relaxed text-lg text-gray-800"><LatexRenderer text={day.summary} /></div>
              </section>
            )}
            {activeSubTab === 'INTERACTIVE' && (
              <section className="animate-fade-in space-y-16">
                <div><div className="flex items-center gap-4 mb-10"><div className="bg-orange-100 p-3 rounded-2xl text-orange-600 shadow-sm"><Layers size={28} /></div><div><h3 className="text-2xl font-black text-gray-900">כרטיסיות מושגים</h3><p className="text-sm text-gray-500">עזר זיכרון עבורך</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{day.flashcards?.map((card, idx) => <FlashcardComp key={idx} index={idx} card={card} />)}</div></div>
                <div className="pt-16 border-t border-gray-100"><div className="flex items-center gap-4 mb-10"><div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 shadow-sm"><MapIcon size={28} /></div><div><h3 className="text-2xl font-black text-gray-900">מפת מושגים</h3><p className="text-sm text-gray-500">הבנת הקשרים בין הנושאים</p></div></div><div className="bg-white rounded-[3rem] p-10 md:p-16 border border-gray-100 shadow-lg relative overflow-hidden"><div className="relative z-10"><ConceptMapVisual links={day.conceptMap || []} /></div></div></div>
              </section>
            )}
            {activeSubTab === 'QUIZ' && (
              <section className="animate-fade-in space-y-8 max-w-4xl mx-auto">
                {!quizFinished ? (
                  <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-gray-50 p-4 flex justify-between items-center border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-gray-700">מבחן בדיקה</span>
                            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm text-indigo-600 font-mono font-bold"><Timer size={16} />{formatTime(elapsedTime)}</div>
                        </div>
                        <div className="text-sm font-bold text-gray-500">שאלה {currentIndex + 1} / {day.quiz?.length || 0}</div>
                    </div>
                    <div className="h-1.5 bg-gray-100 w-full">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500" 
                        style={{ width: `${((currentIndex + 1) / (day.quiz?.length || 1)) * 100}%` }} 
                      />
                    </div>
                    
                    <div className="p-8 md:p-12">
                      <div className="text-2xl md:text-3xl font-black text-gray-900 mb-10 leading-relaxed text-center">
                        <LatexRenderer text={day.quiz[currentIndex].text} />
                      </div>

                      <div className="mb-10">
                        {day.quiz[currentIndex].type === 'OPEN' ? (
                          <div className="space-y-4">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest text-right">התשובה שלך:</label>
                            <textarea
                              value={quizAnswers[currentIndex] || ''}
                              onChange={(e) => handleSelectAnswer(e.target.value)}
                              disabled={(isAnswerChecked || isGrading)}
                              placeholder="הקלד כאן את הפתרון שלך..."
                              className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-[2rem] focus:border-primary outline-none transition-all min-h-[200px] text-right font-medium text-lg shadow-inner"
                            />
                            {isGrading && (
                              <div className="flex items-center gap-2 text-primary font-bold animate-pulse justify-center py-2">
                                <Loader2 size={18} className="animate-spin" />
                                <span>המורה הדיגיטלי בודק את תשובתך...</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            {day.quiz[currentIndex].options.map((option, idx) => {
                              let btnClass = "border-2 border-gray-200 hover:bg-gray-50";
                              const isSelected = quizAnswers[currentIndex] === idx;
                              
                              if (isAnswerChecked) {
                                 if (idx === day.quiz[currentIndex].correctIndex) btnClass = "border-green-500 bg-green-50 text-green-700";
                                 else if (isSelected) btnClass = "border-red-500 bg-red-50 text-red-800";
                                 else btnClass = "border-gray-100 text-gray-400 opacity-60";
                              } else if (isSelected) {
                                 btnClass = "border-primary bg-blue-50 text-primary ring-1 ring-primary";
                              }

                              return (
                                <button 
                                  key={idx} 
                                  onClick={() => handleSelectAnswer(idx)} 
                                  className={`w-full p-5 rounded-2xl text-right transition-all duration-200 font-bold text-lg flex items-center gap-4 ${btnClass}`}
                                >
                                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm font-black shrink-0 transition-all ${isSelected || (isAnswerChecked && idx === day.quiz[currentIndex].correctIndex) ? 'border-transparent bg-primary text-white scale-110' : 'border-gray-300'}`}>
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1">
                                    <LatexRenderer text={option} />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {isAnswerChecked && (
                        <div className={`mb-8 p-8 rounded-[2.5rem] border-2 animate-fade-in shadow-lg ${day.quiz[currentIndex].type === 'OPEN' ? (openQuestionFeedback[currentIndex]?.score && openQuestionFeedback[currentIndex].score >= 80 ? 'bg-green-50 border-green-200' : openQuestionFeedback[currentIndex]?.score && openQuestionFeedback[currentIndex].score >= 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200') : (quizAnswers[currentIndex] === day.quiz[currentIndex].correctIndex ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}`}>
                          <div className="flex items-start gap-6">
                            <div className={`p-4 rounded-2xl shrink-0 shadow-sm ${day.quiz[currentIndex].type === 'OPEN' ? (openQuestionFeedback[currentIndex]?.score && openQuestionFeedback[currentIndex].score >= 80 ? 'bg-green-100 text-green-600' : openQuestionFeedback[currentIndex]?.score && openQuestionFeedback[currentIndex].score >= 40 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600') : (quizAnswers[currentIndex] === day.quiz[currentIndex].correctIndex ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600')}`}>
                                {day.quiz[currentIndex].type === 'OPEN' ? <Award size={32} /> : <Lightbulb size={32} />}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-4">
                                <p className={`font-black text-2xl ${day.quiz[currentIndex].type === 'OPEN' ? (openQuestionFeedback[currentIndex]?.score && openQuestionFeedback[currentIndex].score >= 80 ? 'text-green-800' : openQuestionFeedback[currentIndex]?.score && openQuestionFeedback[currentIndex].score >= 40 ? 'text-yellow-800' : 'text-red-800') : (quizAnswers[currentIndex] === day.quiz[currentIndex].correctIndex ? 'text-green-800' : 'text-red-800')}`}>
                                    {day.quiz[currentIndex].type === 'OPEN' ? (openQuestionFeedback[currentIndex]?.score && openQuestionFeedback[currentIndex].score >= 80 ? 'מצוין!' : openQuestionFeedback[currentIndex]?.score && openQuestionFeedback[currentIndex].score >= 40 ? 'כמעט מדויק' : 'דורש שיפור') : (quizAnswers[currentIndex] === day.quiz[currentIndex].correctIndex ? 'נכון מאוד!' : 'לא בדיוק...')}
                                </p>
                                {day.quiz[currentIndex].type === 'OPEN' && (
                                    <div className={`px-4 py-1.5 rounded-full font-black text-lg shadow-sm ${openQuestionFeedback[currentIndex]?.score && openQuestionFeedback[currentIndex].score >= 80 ? 'bg-green-500 text-white' : openQuestionFeedback[currentIndex]?.score && openQuestionFeedback[currentIndex].score >= 40 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {openQuestionFeedback[currentIndex]?.score}
                                    </div>
                                )}
                              </div>
                              
                              <div className="text-gray-800 leading-relaxed space-y-6 text-lg">
                                {day.quiz[currentIndex].type === 'OPEN' && (
                                  <>
                                    <div className="p-6 bg-white/80 rounded-2xl border border-blue-100 shadow-sm font-bold">
                                       <span className="text-gray-400 block mb-2 uppercase tracking-tighter text-xs font-black">הערות המורה:</span>
                                       {openQuestionFeedback[currentIndex]?.feedback || "בודק..."}
                                    </div>
                                    <div className="p-6 bg-white rounded-2xl border border-blue-100 shadow-sm">
                                      <span className="text-gray-400 block mb-2 uppercase tracking-tighter text-xs font-black">תשובה מצופה:</span>
                                      <LatexRenderer text={day.quiz[currentIndex].modelAnswer || ""} />
                                    </div>
                                  </>
                                )}
                                <div className="pt-4 border-t border-current/10">
                                    <div className="flex items-center gap-2 mb-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                                      <BookOpen size={14} />
                                      <span>הסבר פתרון</span>
                                    </div>
                                    <LatexRenderer text={day.quiz[currentIndex].explanation} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-8 pt-8 border-t border-gray-100">
                         <button onClick={() => {setActiveDay(null); setActiveSubTab('CONTENT');}} className="text-gray-400 hover:text-gray-600 text-sm font-black hover:bg-gray-100 px-4 py-2 rounded-xl transition-colors">צא מהמבחן</button>
                         <div className="flex gap-4">
                            {!isAnswerChecked ? (
                              <button 
                                onClick={() => handleCheckPracticeAnswer(day.quiz)} 
                                disabled={(!quizAnswers[currentIndex] && quizAnswers[currentIndex] !== 0) || isGrading} 
                                className="bg-primary hover:bg-blue-600 disabled:bg-gray-300 text-white px-10 py-4 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center gap-3 active:scale-95"
                              >
                                {isGrading && <Loader2 size={20} className="animate-spin" />}
                                <span>בדוק תשובה</span>
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleNext(day.quiz)} 
                                className="bg-gray-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-lg transition-all flex items-center gap-3 shadow-xl active:scale-95"
                              >
                                {currentIndex === day.quiz.length - 1 ? 'סיים והגש' : 'לשאלה הבאה'}
                                <ChevronLeft size={20} />
                              </button>
                            )}
                         </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto animate-fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
                        <div className="bg-gray-900 p-12 md:p-20 text-center text-white relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="relative z-10">
                                <div className="bg-white/10 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8 backdrop-blur-md border border-white/20">
                                    <Trophy size={56} className="text-yellow-400" />
                                </div>
                                <h2 className="text-5xl font-black mb-4">כל הכבוד!</h2>
                                <p className="text-gray-400 font-bold text-xl">סיימת את יחידת הלימוד בהצלחה</p>
                            </div>
                        </div>

                        <div className="p-10 md:p-16 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-gray-50 p-8 rounded-[2rem] text-center border border-gray-100">
                                    <div className="text-4xl font-black text-gray-800 mb-2">{day.quiz?.length || 0}</div>
                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest">שאלות שפתרת</div>
                                </div>
                                <div className="bg-gray-50 p-8 rounded-[2rem] text-center border border-gray-100">
                                    <div className="text-4xl font-black text-blue-600 mb-2">{formatTime(elapsedTime)}</div>
                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest">זמן עבודה כולל</div>
                                </div>
                            </div>

                            <button 
                                onClick={() => handleCompleteDay(day.dayNumber)} 
                                className="w-full bg-green-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-green-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4"
                            >
                                <Award size={32} />
                                <span>סיום יחידת הלימוד!</span>
                            </button>
                        </div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activePlan) {
    const progress = Math.round(((activePlan.completedDays?.length || 0) / activePlan.totalDays) * 100);
    return (
      <div className="animate-fade-in space-y-8 pb-20 max-w-5xl mx-auto">
        <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-xl border border-gray-100 flex flex-col md:flex-row justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-[4rem] -z-0"></div>
          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-3 text-amber-500 font-black text-xs uppercase tracking-widest mb-4"><Sparkles size={16} /><span>מערך הכנה אישי פעיל</span></div>
            <h2 className="text-4xl font-black text-gray-900 mb-2">{activePlan.targetTopic}</h2>
            <p className="text-gray-500 font-medium">תוכנית הכנה מובנית ל{activePlan.subject} ב{activePlan.totalDays} ימי למידה</p>
            <div className="mt-8"><div className="flex justify-between items-center mb-3"><span className="text-sm font-black text-gray-600">סטטוס הכנה</span><span className="text-sm font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full">{progress}</span></div><div className="h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 shadow-lg" style={{ width: `${progress}%` }}></div></div></div>
          </div>
          <button onClick={() => savePlan(null)} className="md:self-start text-red-500 hover:bg-red-50 p-3 rounded-2xl font-bold flex items-center gap-2 transition-all">
             <RotateCcw size={18} />
             <span>התחל תוכנית חדשה</span>
          </button>
        </div>
        <div className="grid gap-6">
          {activePlan.days?.map((day) => {
            const isCompleted = activePlan.completedDays?.includes(day.dayNumber);
            const isUnlocked = day.dayNumber === 1 || activePlan.completedDays?.includes(day.dayNumber - 1);
            return ( <div key={day.dayNumber} className={`group flex items-center gap-6 p-8 rounded-[2.5rem] border-2 transition-all ${isCompleted ? 'bg-green-50 border-green-100' : isUnlocked ? 'bg-white border-amber-500 shadow-xl transform hover:scale-[1.01]' : 'bg-gray-50 border-gray-100 opacity-60'}`}><div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shrink-0 shadow-lg ${isCompleted ? 'bg-green-500 text-white' : isUnlocked ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{isCompleted ? <CheckCircle size={32} /> : day.dayNumber}</div><div className="flex-1"><h4 className={`text-xl font-black mb-1 ${!isUnlocked ? 'text-gray-400' : 'text-gray-900'}`}>{day.title}</h4><div className="flex items-center gap-4"><span className="text-xs text-gray-400 font-bold flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full"><Clock size={12} /> יחידת תוכן שלמה</span>{isCompleted && <span className="text-xs text-green-600 font-black uppercase tracking-widest bg-green-100 px-3 py-1 rounded-full">הושלם!</span>}</div></div><button onClick={() => isUnlocked && setActiveDay(day.dayNumber)} disabled={!isUnlocked} className={`px-8 py-3 rounded-[1.25rem] font-black flex items-center gap-2 transition-all ${isCompleted ? 'text-green-700 hover:bg-green-100' : isUnlocked ? 'bg-amber-600 text-white shadow-lg hover:bg-amber-700' : 'text-gray-400'}`}>{isCompleted ? 'ערוך שוב' : isUnlocked ? 'סקירה' : 'נעול'}{isUnlocked && <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}</button></div> );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="bg-white rounded-[3rem] p-12 md:p-16 shadow-2xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-[4rem] -z-0"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-12"><div className="bg-amber-100 p-5 rounded-[2rem] text-amber-600 shadow-inner"><Calendar size={40} /></div><div><h2 className="text-4xl font-black text-gray-900 mb-1">הכנה למבחן</h2><p className="text-gray-500 text-lg font-medium">בוא נבנה לך תוכנית למידה מנצחת</p></div></div>
          <div className="space-y-8">
            <div><label className="block text-sm font-black text-gray-700 mb-3 uppercase tracking-widest">על מה המבחן שלך?</label><textarea value={topicInput} onChange={(e) => setTopicInput(e.target.value)} placeholder="לדוגמה: משוואות ריבועיות, המהפכה התעשייתית..." className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-[2rem] focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100 outline-none transition-all h-32 resize-none mb-4 font-medium text-lg" />
                <div className="flex flex-col gap-3"><div className="flex items-center gap-4"><button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-2xl transition-all font-black text-sm border-2 border-gray-100 shadow-sm group"><Paperclip size={20} className="group-hover:rotate-12 transition-transform" /><span>העלה קובץ (דפי חזרה / סיכומי שיעור)</span></button><input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf" className="hidden" /></div>{attachment && (<div className="flex items-center gap-3 bg-amber-600 text-white px-5 py-3 rounded-2xl w-fit animate-fade-in shadow-lg"><FileText size={18} /><span className="text-sm font-black max-w-[200px] truncate">{attachment.name}</span><button onClick={removeAttachment} className="hover:bg-white/20 p-1.5 rounded-full transition-colors ml-1"><X size={16} /></button></div>)}</div>
            </div>
            <div className="grid md:grid-cols-2 gap-8"><div><label className="block text-sm font-black text-gray-700 mb-3 uppercase tracking-widest">כמה ימים נשארו למבחן?</label><div className="flex items-center gap-6 bg-gray-50 p-3 rounded-[1.5rem] border-2 border-gray-100"><button onClick={() => setDaysCount(Math.max(1, daysCount - 1))} className="w-12 h-12 bg-white rounded-2xl shadow-sm font-black text-2xl hover:bg-gray-100 transition-all">-</button><span className="flex-1 text-center font-black text-3xl text-gray-800">{daysCount}</span><button onClick={() => setDaysCount(Math.min(14, daysCount + 1))} className="w-12 h-12 bg-white rounded-2xl shadow-sm font-black text-2xl hover:bg-gray-100 transition-all">+</button></div></div></div>
            <button onClick={() => handleCreatePlan()} disabled={(!topicInput.trim() && !attachment) || loading} className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-4 mt-6 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                <Sparkles size={32} />
                ייצר תוכנית הכנה אישית
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPrepView;
