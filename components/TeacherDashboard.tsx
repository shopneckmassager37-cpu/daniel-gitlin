
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PresentationEditor from './PresentationEditor.tsx';
import { 
  LayoutDashboard, BookCopy, Sparkles, Users, FileText, 
  ChevronLeft, BarChart3, PlusCircle, ArrowRight, Loader2,
  Clock, CheckCircle2, MessageSquare, ClipboardList, Zap,
  Upload, X, Info, Target, List, Lightbulb, BookOpen, Save,
  Presentation, LayoutTemplate, ChevronRight, Share2, Printer, Crown,
  MonitorPlay, Briefcase, Award, Rocket, Brain, Star, ClipboardCheck,
  FileSearch, Search, AlertTriangle, CheckCircle, HelpCircle, GraduationCap, Home, Maximize2, Download, ExternalLink, Edit3, Bell, ShieldCheck
} from 'lucide-react';
import { dbService } from '../services/dbService.ts';
import { Classroom, Subject, Grade, User, LessonPlan, InfographicData, PresentationData, ExamCheckResult, HistoryItem, Notification } from '../types.ts';
import { generateLessonPlan, generateLessonVisuals } from '../services/geminiService.ts';
import LatexRenderer from './LatexRenderer.tsx';
import ChatBot from './ChatBot.tsx';

const CLASSROOMS_COLLECTION = 'classrooms';
const NOTIFICATIONS_COLLECTION = 'notifications';

interface TeacherDashboardProps {
  user: User;
  isPro: boolean;
  history: HistoryItem[];
  checkAndIncrementAiLimit: (type: 'PRACTICE' | 'SUMMARY' | 'CHAT' | 'TEST_PREP') => boolean;
  onSelectClass: (id: string, materialId?: string, studentId?: string) => void;
  onOpenTool: (tool: 'PLANNER' | 'CHAT' | 'MATERIALS' | 'CLASSROOM') => void;
  onAddHistoryItem: (item: HistoryItem) => void;
  onUpgrade: () => void;
  initialTeacherTab?: 'OVERVIEW' | 'PLANNER' | 'CHAT' | 'UPGRADE' | 'EXAM_CHECKER';
  initialLessonPlan?: LessonPlan | null;
  initialHistoryId?: string | null;
  initialExamResult?: ExamCheckResult | null;
  initialGrade?: Grade | null;
  initialTopic?: string | null;
}

const PLANNER_LOADING_STEPS = [
  "מנתח את נושא השיעור...",
  "בונה את גוף השיעור...",
  "מגדיר מטרות פדגוגיות...",
  "מתכנן פעילות קבוצתית...",
  "מנסח שאלות לסיכום ודיון...",
  "מכין שיעורי בית...",
  "מלטש את מערך השיעור הסופי..."
];

const InfographicIcon = ({ type, size = 24 }: { type: string, size?: number }) => {
  switch (type.toLowerCase()) {
    case 'brain': return <Brain size={size} />;
    case 'star': return <Star size={size} />;
    case 'rocket': return <Rocket size={size} />;
    case 'briefcase': return <Briefcase size={size} />;
    case 'award': return <Award size={size} />;
    default: return <Lightbulb size={size} />;
  }
};

const InfographicViewer = ({ data }: { data: InfographicData }) => {
  const viewerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="space-y-6">
      <div ref={viewerRef} className="bg-gradient-to-br from-indigo-900 to-blue-900 p-8 md:p-12 rounded-[3rem] text-white shadow-2xl animate-fade-in text-right relative" dir="rtl">
        <div className="absolute top-6 left-6 flex gap-2 no-print">
            <button onClick={toggleFullScreen} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white/70 hover:text-white shadow-lg"><Maximize2 size={20} /></button>
        </div>
        
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4">{data.mainTitle}</h2>
          <p className="text-blue-200 text-xl font-medium max-w-2xl mx-auto">{data.summaryLine}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {data.keyPoints?.map((point, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:bg-white/20 transition-all">
              <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <InfographicIcon type={point.iconType} />
              </div>
              <h4 className="text-lg font-black mb-2">{point.title}</h4>
              <p className="text-sm text-blue-100 leading-relaxed">{point.description}</p>
            </div>
          ))}
        </div>

        {data.statistics && data.statistics.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 bg-white/5 p-8 rounded-[2rem] border border-white/5">
            {data.statistics.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-black text-blue-400 mb-1">{stat.value}</div>
                <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-500 p-8 rounded-[2rem] text-center shadow-xl">
          <h3 className="text-2xl font-black mb-2">בשורה התחתונה:</h3>
          <p className="text-xl text-blue-50 font-medium">{data.takeaway}</p>
        </div>
      </div>
    </div>
  );
};

const PresentationViewer = ({ data, onEdit }: { data: PresentationData, onEdit?: () => void }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const viewerRef = useRef<HTMLDivElement>(null);

  const slide = data.slides?.[currentSlide];

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    // Fullscreen request is now manual
  }, []);

  const handleSlideClick = () => {
    if (data.slides && currentSlide < data.slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  if (!slide) return null;

  return (
    <div className="space-y-8 no-scrollbar">
      <div ref={viewerRef} className="bg-gray-900 md:rounded-[3rem] shadow-2xl animate-fade-in text-right relative flex flex-col min-h-screen" dir="rtl">
        <div className="absolute top-8 left-8 flex flex-col gap-4 no-print z-50">
            {onEdit && (
                <button 
                    onClick={onEdit} 
                    className="group flex items-center justify-center p-5 bg-white text-gray-900 rounded-2xl font-black shadow-xl hover:bg-gray-50 hover:-translate-y-1 transition-all"
                    title="ערוך מצגת"
                >
                    <Edit3 size={24} />
                </button>
            )}
            <button 
                onClick={toggleFullScreen} 
                className="group flex items-center justify-center p-5 bg-primary text-white rounded-2xl font-black shadow-[0_10px_30px_rgba(59,130,246,0.4)] hover:bg-blue-600 hover:-translate-y-1 transition-all"
            >
                <Maximize2 size={24} />
            </button>
        </div>

        <div 
          onClick={handleSlideClick}
          className="flex-1 flex flex-col justify-center bg-white md:rounded-[2.5rem] m-2 md:m-12 shadow-inner overflow-hidden border-8 border-gray-800 cursor-pointer"
        >
          <div className="bg-indigo-600 text-white p-6 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
               <Presentation size={24} />
               <span className="font-black text-xl">שקופית {currentSlide + 1} / {data.slides?.length || 0}</span>
            </div>
            <span className="font-black text-sm uppercase opacity-60 tracking-widest">{data.title}</span>
          </div>

          <div className="flex-1 p-10 md:p-24 flex flex-col justify-center overflow-y-auto">
            {slide.layout === 'TITLE' && (
               <div className="text-center space-y-12">
                 <h2 className="text-6xl md:text-8xl font-black text-indigo-600 leading-tight drop-shadow-sm">{slide.title}</h2>
                 <div className="w-48 h-2 bg-indigo-600 mx-auto rounded-full" />
                 <p className="text-3xl text-gray-400 font-black">{slide.content?.[0]}</p>
               </div>
            )}

            {slide.layout === 'BULLETS' && (
              <div className="max-w-5xl mx-auto w-full">
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-16 border-r-[12px] border-indigo-600 pr-8 pb-4 inline-block">{slide.title}</h2>
                <ul className="space-y-8">
                  {slide.content?.map((point, i) => (
                    <li key={i} className="flex items-start gap-6 text-2xl md:text-4xl text-gray-700 font-bold leading-relaxed animate-slide-right" style={{animationDelay: `${i*0.1}s`}}>
                       <div className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 mt-2 shadow-lg">{i+1}</div>
                       <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {slide.layout === 'SPLIT' && (
               <div className="grid md:grid-cols-2 gap-20 items-center max-w-6xl mx-auto w-full">
                  <div className="space-y-8">
                    <h2 className="text-4xl md:text-6xl font-black text-indigo-600 leading-tight">{slide.title}</h2>
                    <p className="text-2xl md:text-3xl text-gray-600 leading-relaxed font-medium">{slide.content?.[0]}</p>
                  </div>
                  <div className="bg-indigo-50 p-12 rounded-[3rem] border-4 border-indigo-100 shadow-xl">
                    <ul className="space-y-6">
                       {slide.content?.slice(1).map((item, i) => (
                         <li key={i} className="flex items-center gap-5 text-xl md:text-2xl font-black text-gray-800">
                           <div className="w-4 h-4 rounded-full bg-indigo-600 shadow-sm" />
                           {item}
                         </li>
                       ))}
                    </ul>
                  </div>
               </div>
            )}

            {slide.layout === 'QUOTE' && (
               <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                  <div className="text-indigo-600 opacity-20 mb-8"><MessageSquare size={120} fill="currentColor" /></div>
                  <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-snug italic relative">
                    <span className="absolute -top-12 -right-12 text-9xl text-indigo-100 z-0">"</span>
                    <span className="relative z-10">"{slide.content?.[0]}"</span>
                  </h2>
                  <div className="mt-12 w-24 h-1.5 bg-indigo-600 rounded-full mb-6" />
                  <p className="text-2xl md:text-3xl font-black text-indigo-600">{slide.title}</p>
               </div>
            )}

            {slide.layout === 'IMAGE_TEXT' && (
               <div className="grid md:grid-cols-2 gap-20 items-center max-w-6xl mx-auto w-full">
                  <div className="rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
                    <img src={slide.imageUrl || 'https://picsum.photos/seed/edu/800/600'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="space-y-8">
                    <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight">{slide.title}</h2>
                    <p className="text-2xl md:text-3xl text-gray-600 leading-relaxed font-medium">{slide.content?.[0]}</p>
                  </div>
               </div>
            )}

            {slide.layout === 'THREE_COLUMNS' && (
              <div className="max-w-7xl mx-auto w-full">
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-16 text-center">{slide.title}</h2>
                <div className="grid md:grid-cols-3 gap-8">
                  {slide.content?.map((item, i) => (
                    <div key={i} className="bg-indigo-50 p-10 rounded-[2.5rem] border-2 border-indigo-100 shadow-lg">
                       <div className="text-indigo-600 font-black text-6xl mb-6 opacity-20">0{i+1}</div>
                       <p className="text-xl md:text-2xl text-gray-800 font-bold leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slide.layout === 'TIMELINE' && (
              <div className="max-w-5xl mx-auto w-full">
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-16 text-center">{slide.title}</h2>
                <div className="relative pr-12">
                  <div className="absolute top-0 bottom-0 right-4 w-2 bg-indigo-100 rounded-full" />
                  <div className="space-y-12">
                    {slide.content?.map((item, i) => (
                      <div key={i} className="relative flex items-center gap-10">
                        <div className="absolute -right-12 w-10 h-10 rounded-full bg-indigo-600 border-8 border-white shadow-lg z-10" />
                        <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-100 flex-1">
                           <p className="text-2xl md:text-3xl text-gray-800 font-bold">{item}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {slide.layout === 'SUMMARY' && (
              <div className="max-w-4xl mx-auto w-full bg-indigo-600 text-white p-16 rounded-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-6 mb-12">
                    <div className="bg-white/20 p-4 rounded-2xl"><FileSearch size={48} /></div>
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">{slide.title}</h2>
                  </div>
                  <div className="space-y-6 text-2xl md:text-4xl font-bold leading-tight text-indigo-50">
                    {slide.content?.[0]}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-10 bg-gray-50 border-t-2 border-gray-100 flex justify-between items-center shrink-0 no-print">
             <button 
              disabled={currentSlide === 0} 
              onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => prev - 1); }}
              className="flex items-center gap-4 text-gray-400 hover:text-indigo-600 disabled:opacity-20 font-black transition-all p-4 rounded-2xl hover:bg-white"
             >
               <ChevronRight size={40} />
               <span className="text-2xl">שקופית קודמת</span>
             </button>
             <div className="flex gap-4">
               {data.slides?.map((_, i) => (
                 <button 
                    key={i} 
                    onClick={(e) => { e.stopPropagation(); setCurrentSlide(i); }}
                    className={`w-4 h-4 rounded-full transition-all duration-500 ${i === currentSlide ? 'bg-indigo-600 w-16' : 'bg-gray-300 hover:bg-gray-400'}`} 
                 />
               ))}
             </div>
             <button 
              disabled={data.slides && currentSlide === data.slides.length - 1} 
              onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => prev + 1); }}
              className="flex items-center gap-4 text-indigo-600 hover:text-indigo-800 disabled:opacity-20 font-black transition-all p-4 rounded-2xl hover:bg-white"
             >
               <span className="text-2xl">שקופית הבאה</span>
               <ChevronLeft size={40} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, isPro, history, checkAndIncrementAiLimit, onSelectClass, onOpenTool, onAddHistoryItem, onUpgrade, initialTeacherTab, initialLessonPlan, initialHistoryId, initialExamResult, initialGrade, initialTopic }) => {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PLANNER' | 'CHAT' | 'UPGRADE' | 'EXAM_CHECKER'>(initialTeacherTab || 'OVERVIEW');
  
  // Planner State
  const [plannerTopic, setPlannerTopic] = useState(initialTopic || '');
  const [plannerGrade, setPlannerGrade] = useState<Grade>(initialGrade || Grade.GRADE_10);
  const [plannerInfo, setPlannerInfo] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlan | null>(null);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(initialHistoryId || null);
  const [infographicData, setInfographicData] = useState<InfographicData | null>(null);
  const [presentationData, setPresentationData] = useState<PresentationData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isEditingPresentation, setIsEditingPresentation] = useState(false);
  const [currentView, setCurrentView] = useState<'PLAN' | 'INFOGRAPHIC' | 'PRESENTATION'>('PLAN');

  const [plannerFile, setPlannerFile] = useState<{name: string, data: string} | null>(null);
  const [plannerIncludeGroupActivity, setPlannerIncludeGroupActivity] = useState(true);
  const [plannerIncludeHomework, setPlannerIncludeHomework] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exam Checker State
  const [examFile, setExamFile] = useState<{name: string, data: string, mimeType: string} | null>(null);
  const [isCheckingExam, setIsCheckingExam] = useState(false);
  const [examResult, setExamResult] = useState<ExamCheckResult | null>(null);
  const [examSubject, setExamSubject] = useState<Subject>(initialTopic as Subject || Subject.MATH);
  const [examGrade, setExamGrade] = useState<Grade>(initialGrade || Grade.GRADE_10);
  const examFileInputRef = useRef<HTMLInputElement>(null);

  const handleExamFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setExamFile({
          name: file.name,
          data: base64String,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCheckExam = async () => {
    if (!examFile) return;
    
    setIsCheckingExam(true);
    try {
      const { checkExamAI } = await import('../services/geminiService.ts');
      const result = await checkExamAI(
        examFile.data, 
        examFile.mimeType, 
        examSubject, 
        examGrade
      );
      setExamResult(result);
      
      // Add to history
      onAddHistoryItem({
        id: `exam-${Date.now()}`,
        timestamp: Date.now(),
        subject: examSubject,
        grade: examGrade,
        type: 'EXAM_CHECK',
        title: `בדיקת מבחן: ${examSubject}`,
        score: result.finalScore,
        details: result
      });
    } catch (e) {
      console.error("Exam Check Error:", e);
      alert("אירעה שגיאה בבדיקת המבחן.");
    } finally {
      setIsCheckingExam(false);
    }
  };

  useEffect(() => {
    if (!user.id) return;

    const fetchData = async () => {
      try {
        const [cls, notifs] = await Promise.all([
          dbService.getClassrooms(user.id),
          dbService.getNotifications(user.id)
        ]);
        setClassrooms(cls);
        setNotifications(notifs);
      } catch (e) {
        console.error("Failed to fetch data from Supabase", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000); // Poll every 15 seconds

    return () => clearInterval(interval);
  }, [user.id]);

  const markNotificationAsRead = async (id: string) => {
    try {
      const notification = notifications.find(n => n.id === id);
      if (notification) {
        const updated = { ...notification, isRead: true };
        await dbService.saveNotification(updated);
        setNotifications(prev => prev.map(n => n.id === id ? updated : n));
      }
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  useEffect(() => {
    if (initialTeacherTab) {
      setActiveTab(initialTeacherTab);
    }
    if (initialLessonPlan) {
      setGeneratedPlan(initialLessonPlan);
      setInfographicData(initialLessonPlan.infographic || null);
      setPresentationData(initialLessonPlan.presentation || null);
      
      // Determine initial view
      if (initialLessonPlan.presentation && !initialLessonPlan.mainContent) {
        setCurrentView('PRESENTATION');
      } else if (initialLessonPlan.infographic && !initialLessonPlan.mainContent) {
        setCurrentView('INFOGRAPHIC');
      } else {
        setCurrentView('PLAN');
      }
      
      if (initialTopic) setPlannerTopic(initialTopic);
      if (initialGrade) setPlannerGrade(initialGrade);
    }
    if (initialExamResult) {
      setExamResult(initialExamResult);
      setActiveTab('EXAM_CHECKER');
      if (initialTopic) setExamSubject(initialTopic as Subject);
      if (initialGrade) setExamGrade(initialGrade);
    }
  }, [initialTeacherTab, initialLessonPlan, initialExamResult, initialGrade, initialTopic]);

  useEffect(() => {
    let interval: any;
    if (isGenerating || isGeneratingVisual) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % PLANNER_LOADING_STEPS.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, isGeneratingVisual]);

  const stats = React.useMemo(() => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    let submissionsToday = 0;
    let pendingReview = 0;
    let totalStudents = 0;
    let totalMaterials = 0;

    classrooms?.forEach(c => {
      totalStudents += (c.studentsCount || 0);
      totalMaterials += (c.materials?.length || 0);
      
      c.materials?.forEach(m => {
        m.submissions?.forEach(s => {
          if (s.timestamp > oneDayAgo) {
            submissionsToday++;
          }
          if (!s.teacherGrades || Object.keys(s.teacherGrades).length === 0) {
            pendingReview++;
          }
        });
      });
    });

    return {
      totalStudents,
      totalMaterials,
      activeClasses: classrooms?.length || 0,
      submissionsToday,
      pendingReview
    };
  }, [classrooms]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPlannerFile({
        name: e.target.files[0].name,
        data: 'dummy_base64_data'
      });
    }
  };

  const handleGeneratePlanner = async () => {
    if (!plannerTopic) return;
    
    setIsGenerating(true);
    setLoadingStep(0);
    try {
      console.log("Generating lesson plan for:", plannerTopic);
      const plan = await generateLessonPlan(
        plannerTopic, 
        plannerGrade,
        plannerInfo
      );
      console.log("Lesson plan generated:", plan);
      setGeneratedPlan(plan);
      setInfographicData(null);
      setPresentationData(null);
      setCurrentView('PLAN');

      // Save lesson plan to repository
      const historyId = currentHistoryId || `plan-${Date.now()}`;
      setCurrentHistoryId(historyId);
      
      onAddHistoryItem({
        id: historyId,
        timestamp: Date.now(),
        subject: plan.subject,
        grade: plannerGrade,
        type: 'LESSON_PLAN',
        title: `מערך שיעור: ${plan.title}`,
        content: plan.mainContent,
        details: plan
      });

    } catch (e) {
      console.error("Error in handleGeneratePlanner:", e);
      alert("אירעה שגיאה בייצור המערך.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateVisual = async (type: 'INFOGRAPHIC' | 'PRESENTATION') => {
    if (!generatedPlan) {
      console.error("No generated plan found");
      return;
    }
    
    console.log("Generating visual:", type, "isPro:", isPro);
    
    if (!checkAndIncrementAiLimit('PRACTICE')) {
      console.log("AI limit reached");
      alert("הגעת למכסת הבקשות היומית שלך (10 בקשות). נסה שוב מחר!");
      return;
    }

    if (type === 'INFOGRAPHIC' && infographicData) {
      console.log("Using cached infographic data");
      setCurrentView('INFOGRAPHIC');
      return;
    }
    if (type === 'PRESENTATION' && presentationData) {
      console.log("Using cached presentation data");
      setCurrentView('PRESENTATION');
      return;
    }

    setIsGeneratingVisual(true);
    setLoadingStep(0);
    try {
      console.log("Calling generateLessonVisuals...");
      const visual = await generateLessonVisuals(generatedPlan, type);
      console.log("Visual generated:", visual);
      
      let updatedPlan = { ...generatedPlan };
      if (type === 'INFOGRAPHIC') {
        if (visual && visual.keyPoints) {
          setInfographicData(visual);
          updatedPlan.infographic = visual;
          setCurrentView('INFOGRAPHIC');
        } else {
          console.error("Invalid infographic data:", visual);
          alert("אירעה שגיאה ביצירת האינפוגרפיקה.");
          return;
        }
      } else {
        if (visual && visual.slides && visual.slides.length > 0) {
          setPresentationData(visual);
          updatedPlan.presentation = visual;
          setCurrentView('PRESENTATION');
        } else {
          console.error("Invalid presentation data:", visual);
          alert("אירעה שגיאה ביצירת המצגת.");
          return;
        }
      }

      setGeneratedPlan(updatedPlan);
      
      // Update history with the plan including the new visual
      const historyId = currentHistoryId || `plan-${Date.now()}`;
      setCurrentHistoryId(historyId);

      onAddHistoryItem({
        id: historyId,
        timestamp: Date.now(),
        subject: updatedPlan.subject,
        grade: plannerGrade,
        type: 'LESSON_PLAN',
        title: `מערך שיעור: ${updatedPlan.title}`,
        content: updatedPlan.mainContent,
        details: updatedPlan
      });

    } catch (e) {
      console.error("Error in handleCreateVisual:", e);
      alert("אירעה שגיאה ביצירת העזר הויזואלי.");
    } finally {
      setIsGeneratingVisual(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 md:space-y-10 pb-20">
      <div className="bg-gray-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-16 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest mb-4">
                <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span>מרחב עבודה פדגוגי {user.schoolCode ? `• ${user.schoolName}` : (isPro ? '• תוכנית PRO' : '• תוכנית חינמית')}</span>
              </div>
              <h1 className="text-3xl md:text-6xl font-black mb-3 md:mb-4 tracking-tight">שלום, {user.name} 👋</h1>
              <p className="text-base md:text-xl text-gray-400 font-medium max-w-xl leading-relaxed">
                ברוך הבא למרכז השליטה שלך. כאן תוכל לנהל את הכיתות, לייצר מערכי שיעור חכמים ולעקוב אחר התקדמות התלמידים.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4 w-full md:w-auto">
              <div className="bg-white/5 backdrop-blur-md p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 text-center min-w-[120px] md:min-w-[140px]">
                <div className="text-2xl md:text-3xl font-black text-primary mb-1">{stats.activeClasses}</div>
                <div className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">כיתות פעילות</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 text-center min-w-[120px] md:min-w-[140px]">
                <div className="text-2xl md:text-3xl font-black text-secondary mb-1">{stats.totalStudents}</div>
                <div className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">תלמידים רשומים</div>
              </div>
            </div>
          </div>

            <div className="flex gap-2 mt-8 md:mt-12 bg-white/5 p-1.5 rounded-2xl md:rounded-3xl w-full md:w-fit border border-white/10 overflow-x-auto no-scrollbar">
            {[
              { id: 'OVERVIEW', label: 'לוח בקרה', icon: LayoutDashboard },
              { id: 'PLANNER', label: 'מערכי שיעור', icon: Zap },
              { id: 'EXAM_CHECKER', label: 'בודק מבחנים', icon: ClipboardCheck },
              { id: 'CHAT', label: 'עוזר AI', icon: MessageSquare }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-black transition-all shrink-0 ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-xl' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon className="w-4 h-4 md:w-4.5 md:h-4.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {activeTab === 'OVERVIEW' && (
          <div className="grid lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-2xl font-black text-gray-900 px-4">הכיתות שלי</h3>
              {classrooms?.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {classrooms.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onSelectClass(c.id)}
                      className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-right"
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                          <Users size={24} />
                        </div>
                        <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black">{c.id}</span>
                      </div>
                      <h4 className="text-xl font-black text-gray-800 mb-2">{c.name}</h4>
                      <p className="text-sm text-gray-400 font-bold mb-6">{c.subject} • {c.grade}</p>
                      
                      <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                          <ClipboardList size={14} />
                          {c.materials?.length || 0} חומרים
                        </span>
                        <div className="flex items-center gap-1 text-primary font-black text-sm group-hover:translate-x-4 transition-transform">
                          <span>ניהול כיתה</span>
                          <ChevronLeft size={18} />
                        </div>
                      </div>
                    </button>
                  ))}
                  <button 
                    onClick={() => {
                      if (!isPro && !user.schoolCode && classrooms.length >= 3) {
                        alert("הגעת למכסת הכיתות בתוכנית החינמית (עד 3 כיתות).");
                        return;
                      }
                      onOpenTool('CLASSROOM');
                    }}
                    className="bg-gray-50 border-2 border-dashed border-gray-200 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-400 hover:bg-white hover:border-primary hover:text-primary transition-all group"
                  >
                    <PlusCircle size={48} className="mb-4 group-hover:rotate-90 transition-transform duration-500" />
                    <span className="font-black text-lg">פתח כיתה חדשה</span>
                    {!isPro && <span className="text-[10px] font-bold mt-2">({classrooms.length}/3 כיתות בשימוש)</span>}
                  </button>
                </div>
              ) : (
                <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-200">
                  <Users size={64} className="mx-auto text-gray-200 mb-6" />
                  <h4 className="text-2xl font-black text-gray-800 mb-2">טרם הקמת כיתות</h4>
                  <p className="text-gray-400 mb-8">הקם כיתה כדי להתחיל לשתף חומרים עם התלמידים.</p>
                  <button onClick={() => onOpenTool('CLASSROOM')} className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-black transition-all">הקמת כיתה ראשונה</button>
                </div>
              )}
            </div>
            
            <div className="space-y-8">
              <h3 className="text-2xl font-black text-gray-900 px-4">פעולות מהירות</h3>
              <div className="grid gap-4">
                <button onClick={() => onOpenTool('MATERIALS')} className="w-full flex items-center justify-between p-6 bg-blue-600 text-white rounded-[2rem] shadow-lg hover:bg-blue-700 transition-all text-right group">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl"><PlusCircle size={24} /></div>
                    <div>
                      <h5 className="font-black text-lg leading-tight">העלאת תוכן גלובלי</h5>
                      <p className="text-white/60 text-xs font-bold">יצירת תוכן למספר כיתות</p>
                    </div>
                  </div>
                  <ChevronLeft size={24} className="text-white/40 group-hover:translate-x-4 transition-transform" />
                </button>
                
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-black text-gray-800 flex items-center gap-2">
                      <BarChart3 size={20} className="text-blue-500" />
                      סטטוס כללי ושימוש
                    </h4>
                    {!isPro && (
                      <button 
                        onClick={onUpgrade}
                        className="text-[10px] font-black text-primary hover:underline flex items-center gap-1"
                      >
                        <Crown size={12} />
                        <span>השוו תוכניות</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">הגשות היום</span>
                        <span className="font-black text-gray-800 text-lg">{stats.submissionsToday}</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">מבחנים בבדיקה</span>
                        <span className="font-black text-gray-800 text-lg">{stats.pendingReview}</span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-50">
                      <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">{user.schoolCode ? 'מכסות שימוש' : 'מכסות שימוש (חינם)'}</h5>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className="text-gray-500 font-bold">בקשות AI (היום)</span>
                            <span className={`font-black ${!isPro && (user.aiRequestsToday || 0) >= 10 ? 'text-red-500' : 'text-gray-800'}`}>
                              {isPro ? 'ללא הגבלה' : `${user.aiRequestsToday || 0} / 10`}
                            </span>
                          </div>
                          {!isPro && (
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${ (user.aiRequestsToday || 0) >= 8 ? 'bg-red-500' : 'bg-primary' }`}
                                style={{ width: `${Math.min(100, ((user.aiRequestsToday || 0) / 10) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className="text-gray-500 font-bold">כיתות שניתן לפתוח</span>
                            <span className={`font-black ${!isPro && classrooms.length >= 3 ? 'text-red-500' : 'text-gray-800'}`}>
                              {isPro ? 'ללא הגבלה' : `${classrooms.length} / 3`}
                            </span>
                          </div>
                          {!isPro && (
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${ classrooms.length >= 3 ? 'bg-red-500' : 'bg-blue-500' }`}
                                style={{ width: `${Math.min(100, (classrooms.length / 3) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className="text-gray-500 font-bold">חומרים במאגר (לכל מקצוע)</span>
                            <span className="font-black text-gray-800">
                              {isPro ? 'ללא הגבלה' : 'עד 5'}
                            </span>
                          </div>
                          {!isPro && (
                            <p className="text-[10px] text-gray-400 font-bold">מגבלה של 5 פריטים לכל מקצוע במאגר החומרים.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notifications Section */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h4 className="font-black text-gray-800 mb-6 flex items-center gap-2">
                    <Bell size={20} className="text-orange-500" />
                    התראות אחרונות
                  </h4>
                  <div className="space-y-4">
                    {notifications.length > 0 ? (
                      <div className="space-y-3">
                        {notifications.map(n => (
                          <button 
                            key={n.id}
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              if (n.type === 'ASSIGNMENT_SUBMISSION') {
                                onSelectClass(n.classId!, n.materialId, n.studentId);
                              } else if (n.type === 'CHAT_MESSAGE') {
                                onSelectClass(n.classId!);
                              }
                            }}
                            className={`w-full text-right p-4 rounded-2xl transition-all group border ${n.isRead ? 'bg-gray-50 border-transparent' : 'bg-white border-orange-100 shadow-sm'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-xl shrink-0 ${n.type === 'ASSIGNMENT_SUBMISSION' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                {n.type === 'ASSIGNMENT_SUBMISSION' ? <ClipboardCheck size={16} /> : <MessageSquare size={16} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center gap-2">
                                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                    <h5 className="font-black text-xs text-gray-800 truncate">{n.title}</h5>
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-bold">{new Date(n.timestamp).toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})}</span>
                                </div>
                                <p className="text-[11px] text-gray-500 font-medium leading-tight line-clamp-2">{n.message}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                          <Bell size={24} />
                        </div>
                        <p className="text-sm font-bold text-gray-500">אין לך התראות עדיין</p>
                        <p className="text-[10px] text-gray-400 mt-1">כאשר תיהיה פעילות באחת הכיתות שלך זה יופיע כאן</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'UPGRADE' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="bg-primary/10 p-6 rounded-full mb-6">
              <Loader2 className="animate-spin text-primary" size={48} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">מעביר אותך לדף השדרוג...</h3>
            <p className="text-gray-500 font-bold">מיד תוכל לראות את כל אפשרויות השדרוג שלנו</p>
          </div>
        )}

        {activeTab === 'CHAT' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <ChatBot 
              subject={null} 
              grade={null} 
              userName={user.name} 
              isTeacher={true} 
            />
          </div>
        )}

        {activeTab === 'PLANNER' && (
          <div className="max-w-7xl mx-auto animate-fade-in">
            {isGenerating || isGeneratingVisual ? (
              <div className="bg-white rounded-[3rem] p-20 shadow-xl border border-gray-100 text-center min-h-[500px] flex flex-col items-center justify-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                  <div className="relative bg-primary text-white p-6 rounded-full shadow-lg">
                    <Zap size={48} className="animate-pulse" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-4 max-w-lg mx-auto leading-tight">
                  {isGeneratingVisual ? 'מעבד את העזר הויזואלי...' : 'בונה עבורך מערך שיעור חכם...'}
                </h3>
                <div className="text-lg text-gray-500 font-medium h-8">
                  {PLANNER_LOADING_STEPS[loadingStep]}
                </div>
              </div>
            ) : generatedPlan ? (
              <div className="space-y-8 animate-slide-up">
                <div className="flex items-center justify-between px-4">
                  {currentView !== 'PLAN' ? (
                    <button onClick={() => setCurrentView('PLAN')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
                      <ArrowRight size={20} />
                      <span>חזרה למערך השיעור</span>
                    </button>
                  ) : (
                    <button onClick={() => setGeneratedPlan(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
                      <ArrowRight size={20} />
                      <span>חזרה לממחולל</span>
                    </button>
                  )}
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleCreateVisual('INFOGRAPHIC')} 
                      className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 border shadow-sm ${currentView === 'INFOGRAPHIC' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}
                    >
                      <LayoutTemplate size={18}/> <span>אינפוגרפיקה</span>
                    </button>
                    <button 
                      onClick={() => handleCreateVisual('PRESENTATION')} 
                      className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 border shadow-sm ${currentView === 'PRESENTATION' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`}
                    >
                      <MonitorPlay size={18}/> <span>מצגת שיעור</span>
                    </button>
                    {currentView === 'PLAN' && (
                      <button onClick={() => window.print()} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-lg hover:bg-black transition-all">הדפס מערך</button>
                    )}
                  </div>
                </div>

                {currentView === 'INFOGRAPHIC' && infographicData && (
                  <InfographicViewer data={infographicData} />
                )}
                
                {currentView === 'PRESENTATION' && presentationData && (
                  <PresentationViewer 
                    data={presentationData} 
                    onEdit={() => setIsEditingPresentation(true)}
                  />
                )}

                {isEditingPresentation && presentationData && (
                  <PresentationEditor 
                    data={presentationData}
                    onSave={(updated) => {
                      setPresentationData(updated);
                      setIsEditingPresentation(false);
                      
                      if (generatedPlan) {
                        const updatedPlan = { ...generatedPlan, presentation: updated };
                        setGeneratedPlan(updatedPlan);
                        
                        // Update history with the edited presentation
                        const historyId = currentHistoryId || `plan-${Date.now()}`;
                        setCurrentHistoryId(historyId);

                        onAddHistoryItem({
                          id: historyId,
                          timestamp: Date.now(),
                          subject: updatedPlan.subject,
                          grade: plannerGrade,
                          type: 'LESSON_PLAN',
                          title: `מערך שיעור: ${updatedPlan.title} (מעודכן)`,
                          content: updatedPlan.mainContent,
                          details: updatedPlan
                        });
                      }
                    }}
                    onClose={() => setIsEditingPresentation(false)}
                  />
                )}

                {currentView === 'PLAN' && (
                  <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="bg-primary p-10 md:p-14 text-white">
                      <h2 className="text-4xl md:text-5xl font-black mb-4">{generatedPlan.title}</h2>
                      <div className="flex flex-wrap gap-4 text-white/80 font-bold text-sm">
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"><Target size={16} /> <span>{plannerGrade}</span></div>
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"><Clock size={16} /> <span>45 דקות</span></div>
                      </div>
                    </div>
                    <div className="p-10 md:p-14 space-y-12 bg-gray-50/30 text-right" dir="rtl">
                      <section>
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3"><List className="text-primary" /> מטרות לימודיות</h3>
                        <div className="grid gap-3">
                          {generatedPlan.objectives?.map((obj, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm font-bold text-gray-700 flex items-center gap-3">
                              <div className="w-6 h-6 bg-blue-50 text-primary rounded-full flex items-center justify-center text-xs">{i+1}</div>
                              {obj}
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3"><Lightbulb className="text-yellow-500" /> פתיחה</h3>
                        <div className="text-lg leading-relaxed text-gray-700 italic border-r-4 border-yellow-100 pr-6 py-2">
                          <LatexRenderer text={generatedPlan.introduction} />
                        </div>
                      </section>
                      <section>
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3"><BookOpen className="text-indigo-500" /> גוף השיעור</h3>
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 leading-relaxed text-gray-700 text-lg">
                          <LatexRenderer text={generatedPlan.mainContent} />
                        </div>
                      </section>
                      {generatedPlan.activity && (
                        <section className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100">
                          <h3 className="text-xl font-black text-emerald-900 mb-6 flex items-center gap-3"><Users className="text-emerald-600" /> פעילות קבוצתית</h3>
                          <div className="text-lg text-emerald-800 leading-relaxed font-medium">
                            <LatexRenderer text={generatedPlan.activity} />
                          </div>
                        </section>
                      )}
                      {generatedPlan.discussionQuestions && generatedPlan.discussionQuestions.length > 0 && (
                        <section className="bg-purple-50/50 p-8 rounded-[2.5rem] border border-purple-100">
                          <h3 className="text-xl font-black text-purple-900 mb-6 flex items-center gap-3"><MessageSquare className="text-purple-600" /> שאלות לסיכום ודיון מעמיק</h3>
                          <div className="grid gap-4">
                            {generatedPlan.discussionQuestions.map((q, i) => (
                              <div key={i} className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm font-bold text-gray-700 flex items-start gap-4">
                                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-sm font-black shrink-0">{i+1}</div>
                                <div className="pt-1 leading-relaxed">
                                  <LatexRenderer text={q} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                      <section>
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3"><HelpCircle className="text-orange-500" /> סיכום השיעור</h3>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-gray-700 font-medium">
                          <LatexRenderer text={generatedPlan.summary} />
                        </div>
                      </section>
                      {generatedPlan.homework && (
                        <section className="bg-orange-50/50 p-8 rounded-[2.5rem] border border-orange-100">
                           <h3 className="text-xl font-black text-orange-900 mb-6 flex items-center gap-3"><Home className="text-orange-600" /> שיעורי בית</h3>
                           <div className="text-lg text-orange-800 leading-relaxed font-medium">
                             <LatexRenderer text={generatedPlan.homework} />
                           </div>
                        </section>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-2xl border border-gray-100 text-right space-y-12" dir="rtl">
                <div className="text-center">
                  <div className="bg-primary/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-primary rotate-3">
                    <Zap size={48} />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">מחולל מערכי שיעור AI</h2>
                  <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                    בנה מערך שיעור שלם בתוך שניות. המערכת תייצר עבורך את גוף השיעור, פעילות קבוצתית ושאלות לסיכום.
                  </p>
                </div>
                <div className="grid gap-8 max-w-3xl mx-auto">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">נושא השיעור והכיתה</label>
                    <div className="flex flex-col md:flex-row gap-4">
                      <input 
                        type="text" 
                        value={plannerTopic} 
                        onChange={e => setPlannerTopic(e.target.value)} 
                        placeholder="על מה השיעור הבא שלך? (למשל: המהפכה התעשייתית)" 
                        className="flex-[3] p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl font-bold text-lg outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                      />
                      <select 
                        value={plannerGrade}
                        onChange={e => setPlannerGrade(e.target.value as Grade)}
                        className="flex-1 p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl font-bold outline-none cursor-pointer focus:border-primary transition-all"
                      >
                        {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">חומרים מקדימים (אופציונלי)</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer border-2 border-dashed rounded-[2rem] p-8 text-center transition-all ${plannerFile ? 'bg-blue-50 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400'}`}
                    >
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                      {plannerFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileText size={24} />
                          <span className="font-black truncate max-w-xs">{plannerFile.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); setPlannerFile(null); }} className="p-1 hover:bg-white/50 rounded-lg"><X size={18}/></button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="font-bold">גרור קבצים או לחץ להעלאה</p>
                          <p className="text-xs">סרוק סיכומים או דפי עבודה שה-AI יתבסס עליהם</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">דגשים פדגוגיים נוספים</label>
                    <textarea 
                      value={plannerInfo}
                      onChange={e => setPlannerInfo(e.target.value)}
                      placeholder="למשל: דגש על חשיבה ביקורתית, שילוב תלמידים מתקשים, רלוונטיות לימינו..."
                      className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-[2rem] font-medium outline-none focus:border-primary focus:bg-white transition-all h-32 resize-none shadow-inner"
                    />
                  </div>
                  <button 
                    onClick={handleGeneratePlanner}
                    disabled={!plannerTopic || isGenerating}
                    className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-4 mt-6 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Sparkles size={28} className="text-yellow-400" />
                    <span>ייצר מערך שיעור חכם</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'EXAM_CHECKER' && (
          <div className="max-w-7xl mx-auto animate-fade-in">
            {isCheckingExam ? (
              <div className="bg-white rounded-[3rem] p-20 shadow-xl border border-gray-100 text-center min-h-[500px] flex flex-col items-center justify-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                  <div className="relative bg-primary text-white p-6 rounded-full shadow-lg">
                    <ClipboardCheck size={48} className="animate-pulse" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-4 max-w-lg mx-auto leading-tight">
                  ה-AI בודק את המבחן...
                </h3>
                <p className="text-lg text-gray-500 font-medium">
                  מזהה שאלות, מנתח תשובות ומחשב ציונים. זה ייקח כמה שניות.
                </p>
              </div>
            ) : examResult ? (
              <div className="space-y-8 animate-slide-up" dir="rtl">
                <div className="flex items-center justify-between px-4">
                  <button onClick={() => setExamResult(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
                    <ArrowRight size={20} />
                    <span>בדיקת מבחן נוסף</span>
                  </button>
                  <div className="flex gap-4">
                    <button onClick={() => window.print()} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-lg hover:bg-black transition-all flex items-center gap-2">
                      <Printer size={18} />
                      <span>הדפס דוח בדיקה</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 md:p-14 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
                      <div>
                        <h2 className="text-3xl md:text-5xl font-black mb-3 md:mb-4">תוצאות בדיקת מבחן</h2>
                        <div className="flex flex-wrap gap-3 md:gap-4 text-white/80 font-bold text-[10px] md:text-sm">
                          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"><BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span>{examSubject}</span></div>
                          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"><Target className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span>{examGrade}</span></div>
                        </div>
                      </div>
                      <div className="bg-white/20 backdrop-blur-md p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/20 text-center min-w-[140px] md:min-w-[180px]">
                        <div className="text-4xl md:text-5xl font-black mb-1">{examResult.finalScore}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-80">ציון סופי</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-14 space-y-8 md:space-y-12">
                    <section className="bg-blue-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-blue-100">
                      <h3 className="text-lg md:text-xl font-black text-blue-900 mb-3 md:mb-4 flex items-center gap-3"><Sparkles className="text-blue-600 w-4.5 h-4.5 md:w-6 md:h-6" /> משוב כללי</h3>
                      <p className="text-base md:text-lg text-blue-800 leading-relaxed font-medium">{examResult.overallFeedback}</p>
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-3"><List className="text-primary w-5 h-5 md:w-6 md:h-6" /> ניתוח לפי שאלות</h3>
                      <div className="grid gap-4 md:grid-gap-6">
                        {examResult.questionsAnalysis.map((q, i) => (
                          <div key={i} className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4 md:space-y-6">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl text-gray-600">
                                  {q.questionNumber}
                                </div>
                                <div>
                                  <div className={`text-[9px] md:text-xs font-black px-2 py-0.5 md:py-1 rounded-md inline-block mb-1 ${
                                    q.status === 'CORRECT' ? 'bg-green-100 text-green-700' :
                                    q.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {q.status === 'CORRECT' ? 'תשובה נכונה' : q.status === 'PARTIAL' ? 'נכונה חלקית' : 'תשובה שגויה'}
                                  </div>
                                  <h4 className="font-black text-sm md:text-base text-gray-900">שאלה מספר {q.questionNumber}</h4>
                                </div>
                              </div>
                              <div className="text-left">
                                <div className="text-xl md:text-2xl font-black text-gray-900">{q.pointsEarned} / {q.totalPoints}</div>
                                <div className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase">נקודות</div>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                              <div className="space-y-2">
                                <label className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">תשובת התלמיד</label>
                                <div className="p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 font-medium text-sm md:text-base text-gray-700 italic">
                                  {q.studentAnswer || 'לא זוהתה תשובה'}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">התשובה הנכונה</label>
                                <div className="p-3 md:p-4 bg-green-50/50 rounded-xl md:rounded-2xl border border-green-100 font-medium text-sm md:text-base text-green-800">
                                  {q.correctAnswer}
                                </div>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50">
                              <label className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2 mb-2">הסבר ה-AI לציון</label>
                              <p className="text-xs md:text-sm text-gray-600 leading-relaxed">{q.explanation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-2xl border border-gray-100 text-right space-y-12" dir="rtl">
                <div className="text-center">
                  <div className="bg-primary/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-primary -rotate-3">
                    <ClipboardCheck size={48} />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">בודק מבחנים AI</h2>
                  <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                    העלה צילום של מבחן פתור, וה-AI יזהה את השאלות, יבדוק את התשובות ויתן ציון מפורט לכל שאלה עם הסברים.
                  </p>
                </div>

                <div className="grid gap-8 max-w-3xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">מקצוע</label>
                      <select 
                        value={examSubject}
                        onChange={e => setExamSubject(e.target.value as Subject)}
                        className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl font-bold outline-none cursor-pointer focus:border-primary transition-all"
                      >
                        {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">כיתה</label>
                      <select 
                        value={examGrade}
                        onChange={e => setExamGrade(e.target.value as Grade)}
                        className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl font-bold outline-none cursor-pointer focus:border-primary transition-all"
                      >
                        {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">צילום המבחן</label>
                    <div 
                      onClick={() => examFileInputRef.current?.click()}
                      className={`cursor-pointer border-2 border-dashed rounded-[2rem] p-12 text-center transition-all ${examFile ? 'bg-blue-50 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400'}`}
                    >
                      <input type="file" accept="image/*,application/pdf" ref={examFileInputRef} onChange={handleExamFileUpload} className="hidden" />
                      {examFile ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative">
                            <img src={`data:${examFile.mimeType};base64,${examFile.data}`} alt="Exam" className="w-32 h-32 object-cover rounded-2xl shadow-md border-2 border-white" />
                            <button onClick={(e) => { e.stopPropagation(); setExamFile(null); }} className="absolute -top-3 -left-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-all"><X size={16}/></button>
                          </div>
                          <span className="font-black truncate max-w-xs">{examFile.name}</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm text-gray-300 group-hover:text-primary transition-colors">
                            <Upload size={40} />
                          </div>
                          <div>
                            <p className="font-black text-xl text-gray-900">לחץ להעלאה או צילום</p>
                            <p className="text-sm text-gray-500 mt-1">תמונות בפורמט JPG, PNG או PDF</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={handleCheckExam}
                    disabled={!examFile || isCheckingExam}
                    className="w-full bg-primary text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 mt-6 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isCheckingExam ? (
                      <Loader2 className="animate-spin" size={28} />
                    ) : (
                      <ClipboardCheck size={28} />
                    )}
                    <span>בדוק מבחן עכשיו</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
