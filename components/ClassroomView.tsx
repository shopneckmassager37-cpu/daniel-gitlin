
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { dbService } from '../services/dbService.ts';
import { supabase } from '../services/supabaseClient.ts';
import { Classroom, ClassroomMaterial, Subject, Grade, User, Question, MaterialType, ClassroomSubmission, ClassroomMessage, HistoryItem, StudyTopic, Notification, GameType } from '../types.ts';
import { generateSummary, generateAssignment, generateQuestions, generateClassroomAnalytics, getStudyTopics, generateStudentAnalytics, detectSubjectAI, gradeOpenQuestion, generateExamFeedback } from '../services/geminiService.ts';
import { 
  School, Plus, Users, UserPlus, BookOpen, FileText, PlusCircle, ArrowRight, Loader2, Sparkles, 
  Copy, Check, Trash2, X, ChevronLeft, Upload, FileDown, Info, Clock, Edit3, Send, ListChecks, ClipboardList, 
  BellRing, Bot, User as UserIcon, CheckCircle2, Trophy, MessageSquare, Save, Calendar, Paperclip, Maximize2, Minimize2,
  BarChart3, TrendingUp, Target, Star, ClipboardCheck, Library, Settings2, FolderArchive, ArrowLeft, MoreVertical,
  UserCheck, History, AlertCircle, Search as SearchIcon, RotateCcw, Mail, GraduationCap, BookmarkPlus, Zap, Gamepad2, Play, Link, Download
} from 'lucide-react';
import LatexRenderer from './LatexRenderer.tsx';
import RichEditor from './RichEditor.tsx';
import GlobalContentEditor from './GlobalContentEditor.tsx';
import { GameRunner } from './LearningGamesView.tsx';
import { Video, VideoOff, Radio } from 'lucide-react';

const DB_KEY = 'lumdim_global_database_v1';
const LIBRARY_KEY = 'lumdim_library_v1';

const getHebrewType = (type: MaterialType): string => {
  switch (type) {
    case 'SUMMARY': return 'סיכום';
    case 'TEST': return 'מבחן/תרגול';
    case 'ASSIGNMENT': return 'מטלה';
    case 'UPCOMING_TEST': return 'מבחן קרוב';
    case 'UPLOADED_FILE': return 'קובץ';
    case 'GAME': return 'משחק למידה';
    default: return 'חומר למידה';
  }
};

const getTypeIcon = (type: MaterialType) => {
  switch (type) {
    case 'SUMMARY': return <FileText size={20} className="text-blue-500" />;
    case 'TEST': return <ListChecks size={20} className="text-indigo-500" />;
    case 'ASSIGNMENT': return <ClipboardList size={20} className="text-emerald-500" />;
    case 'UPCOMING_TEST': return <BellRing size={20} className="text-orange-500" />;
    case 'UPLOADED_FILE': return <Upload size={20} className="text-blue-600" />;
    case 'GAME': return <Gamepad2 size={20} className="text-purple-500" />;
    default: return <BookOpen size={20} className="text-gray-400" />;
  }
};

interface ClassroomViewProps {
  user: User;
  onBack: () => void;
  onStartTestPrep: (subject: Subject, grade: Grade, topic: string, days: number, attachment?: any) => void;
  onAddHistoryItem: (item: HistoryItem) => void;
  initialClassId?: string | null;
  initialMaterialId?: string | null;
  initialStudentId?: string | null;
  initialTab?: 'MATERIALS' | 'CHAT' | 'STUDENTS' | 'ANALYTICS' | null;
  initialCreateMode?: boolean;
  onUpdateUser?: (u: User) => void;
  isPro?: boolean;
  checkAndIncrementAiLimit?: (type: 'PRACTICE' | 'SUMMARY' | 'CHAT' | 'TEST_PREP') => boolean;
  onToggleFullscreen?: (fullscreen: boolean) => void;
}

const ClassroomView: React.FC<ClassroomViewProps> = ({ 
  user, onBack, onStartTestPrep, onAddHistoryItem, initialClassId, initialMaterialId, initialStudentId, initialTab, initialCreateMode, onUpdateUser, isPro, checkAndIncrementAiLimit, onToggleFullscreen 
}) => {
  const [allGlobalClassrooms, setAllGlobalClassrooms] = useState<Classroom[]>([]);
  const [isCreating, setIsCreating] = useState(initialCreateMode || false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<ClassroomMaterial | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'CHAT' | 'STUDENTS' | 'ANALYTICS'>(initialTab || 'MATERIALS');
  const [activeViewerPageIndex, setActiveViewerPageIndex] = useState(0);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [addToLibrary, setAddToLibrary] = useState(user.settings?.defaultAddToLibrary ?? true);
  const [userGenerationPrompt, setUserGenerationPrompt] = useState('');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [classroomAIInsights, setClassroomAIInsights] = useState<{focus: string; strengths: string; recommendations: string} | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [chatRecipient, setChatRecipient] = useState<string>('ALL'); 
  const [chatAttachment, setChatAttachment] = useState<{name: string, data: string, mimeType: string} | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [materialViewTab, setMaterialViewTab] = useState<'SUBMISSIONS' | 'VIEW'>('SUBMISSIONS');
  const [editingMaterial, setEditingMaterial] = useState(false);
  const [viewingSubmissionId, setViewingSubmissionId] = useState<string | null>(null);
  const [isPlayingGame, setIsPlayingGame] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  // Student Submission States
  const [studentSubmissionText, setStudentSubmissionText] = useState('');
  const [studentSubmissionFile, setStudentSubmissionFile] = useState<{name: string, data: string, mimeType: string} | null>(null);
  const [studentQuizAnswers, setStudentQuizAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMySubmissionContent, setShowMySubmissionContent] = useState(false);
  const studentFileRef = useRef<HTMLInputElement>(null);

  const [aiMcqCount, setAiMcqCount] = useState(3);
  const [aiOpenCount, setAiOpenCount] = useState(2);
  const [joinCode, setJoinCode] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState<Subject | string>(Subject.MATH);
  const [newClassGrade, setNewClassGrade] = useState<Grade>(Grade.GRADE_7);
  const [isManualClassSubject, setIsManualClassSubject] = useState(false);
  const [customClassSubject, setCustomClassSubject] = useState('');
  const [isDetectingClassSubject, setIsDetectingClassSubject] = useState(false);
  const classTitleTimeoutRef = useRef<any>(null);

  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [studentAIInsight, setStudentAIInsight] = useState<{insight: string, recommendations: string[]} | null>(null);
  const [loadingStudentAI, setLoadingStudentAI] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSeenPrivateMsgIdRef = useRef<string | null>(null);

  const loadFromDB = async () => {
    try {
      const data = await dbService.getClassrooms(user.id);
      if (data && data.length > 0) {
        setAllGlobalClassrooms(data);
        localStorage.setItem(DB_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.error("Failed to load classrooms from Supabase", e);
      const data = localStorage.getItem(DB_KEY);
      if (data) setAllGlobalClassrooms(JSON.parse(data));
    }
  };

  useEffect(() => {
    loadFromDB();
    
    // Real-time subscription
    let channel: any;
    if (supabase && supabase.channel) {
      channel = supabase
        .channel('classroom-realtime')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'classrooms' 
        }, () => {
          loadFromDB();
        })
        .subscribe();
    }

    const sync = (e: any) => {
      // Don't reload if we were the ones who triggered the update
      if (e instanceof CustomEvent && e.detail?.source === 'local') return;
      loadFromDB();
    };
    window.addEventListener('storage', sync);
    window.addEventListener('lumdim-db-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('lumdim-db-updated', sync);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (activeMaterial) {
      setActiveViewerPageIndex(0);
      setStudentQuizAnswers({});
      setRevealedAnswers({});
    }
  }, [activeMaterial?.id]);

  useEffect(() => {
    if (onToggleFullscreen) {
      onToggleFullscreen(!!activeMaterial || workspaceOpen);
    }
  }, [activeMaterial, workspaceOpen, onToggleFullscreen]);

  const activeClass = allGlobalClassrooms.find(c => c.id === activeClassId);
  const isTeacherOfThisClass = activeClass?.teacherId === user.id;
  const isTeacherRole = user.role === 'TEACHER';
  
  const classStats = useMemo(() => {
    if (!activeClass) return null;
    
    const totalMaterials = (activeClass.materials || []).length;
    const testMaterials = (activeClass.materials || []).filter(m => m.type === 'TEST' || m.type === 'ASSIGNMENT');
    
    let totalScoreSum = 0;
    let totalSubmissionsCount = 0;
    let possibleSubmissions = (activeClass.studentsCount || 0) * testMaterials.length;
    
    testMaterials.forEach(m => {
        m.submissions?.forEach(s => {
            if (s.aiScore !== undefined) {
                totalScoreSum += s.aiScore;
                totalSubmissionsCount++;
            }
        });
    });

    const averageScore = totalSubmissionsCount > 0 ? Math.round(totalScoreSum / totalSubmissionsCount) : 0;
    const submissionRate = possibleSubmissions > 0 ? Math.round((totalSubmissionsCount / possibleSubmissions) * 100) : 0;

    return {
        averageScore,
        submissionRate,
        totalMaterials,
        testMaterialsCount: testMaterials.length,
        studentsCount: activeClass.studentsCount || 0
    };
  }, [activeClass]);

  useEffect(() => {
    if (initialClassId) setActiveClassId(initialClassId);
    if (initialStudentId) setViewingStudentId(initialStudentId);
    if (initialCreateMode) setIsCreating(true);
    if (initialTab) setActiveTab(initialTab as any);
  }, [initialClassId, initialStudentId, initialCreateMode, initialTab]);

  useEffect(() => {
    if (activeClassId && initialMaterialId) {
      const targetClass = allGlobalClassrooms.find(c => c.id === activeClassId);
      if (targetClass && targetClass.materials) {
        const mat = targetClass.materials.find(m => m.id === initialMaterialId);
        if (mat) setActiveMaterial(mat);
      }
    }
  }, [activeClassId, initialMaterialId, allGlobalClassrooms]);


  const handleRefreshAIAnalytics = async () => {
    if (!activeClass) return;
    setLoadingAnalytics(true);
    try {
        const res = await generateClassroomAnalytics(activeClass.name, activeClass.subject, activeClass.materials || []);
        setClassroomAIInsights(res);
    } catch (e) {
        console.error("Failed to generate classroom insights", e);
    } finally {
        setLoadingAnalytics(false);
    }
  };

  const handleFetchStudentAI = async (studentName: string, stats: any) => {
    setLoadingStudentAI(true);
    setStudentAIInsight(null);
    try {
        const res = await generateStudentAnalytics(studentName, stats);
        setStudentAIInsight(res);
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingStudentAI(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!chatInput.trim() && !chatAttachment) || !activeClass) return;

    // Check AI limit for teachers in chat
    if (isTeacherRole && checkAndIncrementAiLimit && !checkAndIncrementAiLimit('CHAT')) {
      const msg = user?.schoolCode ? "הגעת למכסת בקשות ה-AI היומיות שלך. נסה שוב מחר!" : "הגעת למכסת 10 בקשות ה-AI היומיות שלך בתוכנית החינמית. שדרג לפרו כדי להמשיך ללא הגבלה!";
      alert(msg);
      return;
    }

    const newMessage: ClassroomMessage = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: user.name || 'משתמש',
      recipientId: chatRecipient === 'ALL' ? undefined : chatRecipient,
      text: chatInput,
      timestamp: Date.now(),
      attachment: chatAttachment ? { mimeType: chatAttachment.mimeType, data: chatAttachment.data } : undefined
    };
    const updatedList = allGlobalClassrooms.map(c => c.id === activeClass.id ? { ...c, messages: [...(c.messages || []), newMessage] } : c);
    saveToDB(updatedList);

    // Send notification to teacher if student sends message
    if (!isTeacherOfThisClass) {
      try {
        await dbService.saveNotification({
          id: `msg-${newMessage.id}`,
          userId: activeClass.teacherId,
          type: 'CHAT_MESSAGE',
          title: 'הודעה חדשה בצ׳אט',
          message: `הודעה חדשה מ${user.name} בכיתה ${activeClass.name}`,
          timestamp: Date.now(),
          isRead: false,
          link: `CLASSROOM_CHAT:${activeClass.id}`,
          classId: activeClass.id
        } as any);
      } catch (e) {
        console.error("Failed to send notification", e);
      }
    }

    setChatInput('');
    setChatAttachment(null);
  };

  // Smart Class Subject Detection
  useEffect(() => {
    if (isManualClassSubject || !newClassName || newClassName.length < 3) return;

    if (classTitleTimeoutRef.current) clearTimeout(classTitleTimeoutRef.current);
    
    classTitleTimeoutRef.current = setTimeout(async () => {
      setIsDetectingClassSubject(true);
      try {
        const detected = await detectSubjectAI(newClassName);
        setNewClassSubject(detected);
      } catch (e) {
        console.error("Class subject detection failed", e);
      } finally {
        setIsDetectingClassSubject(false);
      }
    }, 1500);

    return () => clearTimeout(classTitleTimeoutRef.current);
  }, [newClassName, isManualClassSubject]);

  const handleCreateClass = () => {
    if(!newClassName.trim()) return;

    // Check class limit for free users
    if (!isPro && !user.schoolCode && user.role === 'TEACHER') {
      const teacherClassesCount = allGlobalClassrooms.filter(c => c.teacherId === user.id).length;
      if (teacherClassesCount >= 3) {
        alert("הגעת למגבלה של 3 כיתות בתוכנית החינמית. שדרג לפרו כדי ליצור כיתות ללא הגבלה!");
        return;
      }
    }

    const finalSubject = isManualClassSubject ? customClassSubject : newClassSubject;
    const classId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newClass: Classroom = { 
      id: classId, 
      code: classId,
      name: newClassName, 
      subject: finalSubject, 
      grade: newClassGrade, 
      teacherName: user.name || 'מורה', 
      teacherId: user.id, 
      materials: [], 
      messages: [], 
      studentsCount: 0, 
      students: [], 
      studentIds: [] 
    }; 
    const latest = JSON.parse(localStorage.getItem(DB_KEY) || '[]'); 
    saveToDB([newClass, ...latest]); 
    setIsCreating(false); 
    setActiveClassId(newClass.id);
    setNewClassName('');
    setIsManualClassSubject(false);
    setCustomClassSubject('');
  };

  const handleJoinClass = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    try {
      // Fetch directly from server to ensure we check Supabase too
      const targetClass = await dbService.getClassroomByCode(code);

      if (!targetClass) {
        alert("קוד כיתה לא נמצא. אנא ודא שהקלדת נכון.");
        return;
      }

      if (targetClass.studentIds?.includes(user.id)) {
        alert("אתה כבר רשום לכיתה זו.");
        setIsJoining(false);
        setActiveClassId(targetClass.id);
        return;
      }

      const updatedClass: Classroom = {
        ...targetClass,
        studentsCount: (targetClass.studentsCount || 0) + 1,
        studentIds: [...(targetClass.studentIds || []), user.id],
        students: [...(targetClass.students || []), user.name || 'תלמיד']
      };

      const alreadyInList = allGlobalClassrooms.some(c => c.id === updatedClass.id);
      const updatedList = alreadyInList 
        ? allGlobalClassrooms.map(c => c.id === updatedClass.id ? updatedClass : c)
        : [updatedClass, ...allGlobalClassrooms];

      await saveToDB(updatedList);
      setIsJoining(false);
      setJoinCode('');
      setActiveClassId(updatedClass.id);
      alert(`הצטרפת בהצלחה לכיתה "${updatedClass.name}"!`);
    } catch (e) {
      console.error("Join class failed", e);
      alert("שגיאה בחיבור לשרת. נסה שוב מאוחר יותר.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClassroom = async (classId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('האם אתה בטוח שברצונך למחוק את הכיתה לצמיתות? פעולה זו תמחק את כל החומרים וההודעות עבור כל המשתתפים.')) return;
    
    try {
      setLoading(true);
      await dbService.deleteClassroom(classId);
      setAllGlobalClassrooms(prev => prev.filter(c => c.id !== classId));
      if (activeClassId === classId) {
        setActiveClassId(null);
        setActiveTab('MATERIALS');
      }
    } catch (err) {
      console.error("Failed to delete classroom", err);
      alert("שגיאה במחיקת הכיתה");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveClassroom = async (classId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('האם אתה בטוח שברצונך לצאת מהכיתה?')) return;
    
    try {
      setLoading(true);
      await dbService.leaveClassroom(classId, user.id);
      // Update local state
      setAllGlobalClassrooms(prev => prev.filter(c => c.id !== classId));
      if (activeClassId === classId) {
        setActiveClassId(null);
        setActiveTab('MATERIALS');
      }
    } catch (err) {
      console.error("Failed to leave classroom", err);
      alert("שגיאה ביציאה מהכיתה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeMaterial && user?.role === 'STUDENT' && user?.id && activeClass) {
      // Add to history if it's a viewable item
      if (['SUMMARY', 'UPCOMING_TEST', 'GAME'].includes(activeMaterial.type)) {
        onAddHistoryItem({
          id: `hist-view-${activeMaterial.id}-${Date.now()}`,
          timestamp: Date.now(),
          subject: activeClass.subject || '',
          grade: (activeClass.grade || Grade.GRADE_7) as Grade,
          type: activeMaterial.type as any,
          title: activeMaterial.title,
          classId: activeClass.id
        });
      }
    }
  }, [activeMaterial?.id, activeClass?.id, user?.role, user?.id]);

  const saveToDB = async (updatedList: Classroom[]) => {
    // Update local state and storage immediately for responsiveness
    localStorage.setItem(DB_KEY, JSON.stringify(updatedList));
    setAllGlobalClassrooms(updatedList);
    
    // Dispatch event with a flag to avoid redundant reloads in this same instance
    const event = new CustomEvent('lumdim-db-updated', { detail: { source: 'local' } });
    window.dispatchEvent(event);

    try {
      await dbService.syncClassrooms(updatedList);
    } catch (e) {
      console.error("Failed to sync classrooms to Supabase", e);
    }
  };

  const visibleMessages = activeClass?.messages?.filter(msg => {
    if (!msg.recipientId) return true; 
    return msg.recipientId === user.id || msg.senderId === user.id;
  }) || [];

  // Auto-switch recipient when receiving a private message
  useEffect(() => {
    if (activeTab === 'CHAT' && visibleMessages.length > 0) {
      const lastMsg = visibleMessages[visibleMessages.length - 1];
      // If the last message is private, sent to me, and I'm not the sender
      if (lastMsg.recipientId === user.id && lastMsg.senderId !== user.id) {
        if (lastMsg.id !== lastSeenPrivateMsgIdRef.current) {
          setChatRecipient(lastMsg.senderId);
          lastSeenPrivateMsgIdRef.current = lastMsg.id;
        }
      }
    }
  }, [visibleMessages, activeTab, user.id]);

  const handlePublish = (mat: ClassroomMaterial, classIds: string[]) => {
    const updatedList = allGlobalClassrooms.map(c => {
       const existingIndex = c.materials.findIndex(m => m.id === mat.id);
       if (classIds.includes(c.id) || existingIndex >= 0) {
          let updatedMaterials = [...c.materials];
          if (existingIndex >= 0) {
             updatedMaterials[existingIndex] = mat;
          } else {
             updatedMaterials = [...c.materials, mat];
          }
          return { ...c, materials: updatedMaterials };
       }
       return c;
    });
    saveToDB(updatedList);
    
    // If editing, update the active material view
    if (editingMaterial && activeMaterial?.id === mat.id) {
       setActiveMaterial(mat);
    }

    // Save to teacher's personal repository (history)
    onAddHistoryItem({
      id: `repo-${mat.id}`,
      timestamp: mat.timestamp,
      subject: mat.subject as Subject,
      grade: mat.grade as Grade,
      type: mat.type === 'SUMMARY' ? 'SUMMARY' : (mat.type === 'TEST' ? 'PRACTICE' : 'LESSON_PLAN'),
      title: mat.title,
      content: mat.content,
      details: mat
    });

    setWorkspaceOpen(false);
    setEditingMaterial(false);
    alert(editingMaterial ? "השינויים נשמרו בהצלחה!" : "החומר פורסם בהצלחה!");
  };

  const handleCloseWorkspace = () => {
    setWorkspaceOpen(false);
    setEditingMaterial(false);
  };

  const handleStudentSubmit = async () => {
    if (!activeMaterial || !activeClass) return;
    
    const isTest = activeMaterial.type === 'TEST';
    if (!isTest && !studentSubmissionText.trim() && !studentSubmissionFile) {
        alert("נא לכתוב תשובה או לצרף קובץ");
        return;
    }

    setIsSubmitting(true);
    try {
        let aiScore = undefined;
        let aiFeedback = "הגשה התקבלה.";

        if (isTest) {
            const questions = activeMaterial.questions || [];
            const totalQuestions = questions.length;
            
            if (totalQuestions === 0) {
                aiScore = 100;
            } else {
                let totalPointsEarned = 0;
                const openQuestionsToGrade: Array<{q: Question, ans: string, index: number}> = [];
                const detailedResults: any[] = [];

                questions.forEach((q, idx) => {
                    const ans = studentQuizAnswers[q.id];
                    if (q.type === 'MCQ') {
                        const isCorrect = ans === q.correctIndex;
                        if (isCorrect) totalPointsEarned += 100;
                        detailedResults.push({
                            questionId: q.id,
                            isCorrect,
                            explanation: q.explanation || (isCorrect ? 'תשובה נכונה!' : `תשובה לא נכונה. התשובה הנכונה היא: ${q.options[q.correctIndex]}`),
                            studentAnswer: q.options[ans as number] || 'לא נענה',
                            correctAnswer: q.options[q.correctIndex]
                        });
                    } else if (q.type === 'OPEN') {
                        if (ans) {
                            openQuestionsToGrade.push({ q, ans, index: idx });
                        } else {
                            detailedResults.push({
                                questionId: q.id,
                                isCorrect: false,
                                explanation: 'לא הוגשה תשובה.',
                                studentAnswer: '',
                                correctAnswer: q.modelAnswer
                            });
                        }
                    }
                });

                if (activeMaterial.autoGradeByAI && openQuestionsToGrade.length > 0) {
                    const results = await Promise.all(openQuestionsToGrade.map(item => 
                        gradeOpenQuestion(item.q.text, item.q.modelAnswer || "", item.ans)
                    ));
                    results.forEach((r, i) => {
                        totalPointsEarned += r.score;
                        detailedResults.push({
                            questionId: openQuestionsToGrade[i].q.id,
                            isCorrect: r.score >= 60,
                            explanation: r.feedback,
                            studentAnswer: openQuestionsToGrade[i].ans,
                            correctAnswer: openQuestionsToGrade[i].q.modelAnswer
                        });
                    });
                } else if (openQuestionsToGrade.length > 0) {
                    openQuestionsToGrade.forEach(item => {
                        detailedResults.push({
                            questionId: item.q.id,
                            isCorrect: false,
                            explanation: 'ממתין לבדיקת מורה.',
                            studentAnswer: item.ans,
                            correctAnswer: item.q.modelAnswer
                        });
                    });
                }

                // Calculate score only if autoGradeByAI is true
                if (activeMaterial.autoGradeByAI) {
                    aiScore = Math.round(totalPointsEarned / totalQuestions);
                    // Generate a nice summary feedback
                    try {
                        aiFeedback = await generateExamFeedback(aiScore, activeMaterial.subject || '', activeMaterial.grade || '', detailedResults);
                    } catch (e) {
                        console.error("Failed to generate exam feedback", e);
                    }
                } else {
                    aiScore = undefined;
                    aiFeedback = "הגשתך התקבלה וממתינה לבדיקת המורה.";
                }

                const newSubmission: ClassroomSubmission = {
                    id: Math.random().toString(36).substr(2, 9),
                    studentId: user.id,
                    studentName: user.name,
                    timestamp: Date.now(),
                    quizResults: studentQuizAnswers,
                    aiScore,
                    aiFeedback,
                    detailedResults,
                    attachment: { name: '', mimeType: '', data: '' }
                };

                const updatedList = allGlobalClassrooms.map(c => {
                    if (c.id === activeClass.id) {
                        const updatedMaterials = c.materials.map(m => {
                            if (m.id === activeMaterial.id) {
                                const updatedMat = { ...m, submissions: [...(m.submissions || []), newSubmission] };
                                setActiveMaterial(updatedMat);
                                return updatedMat;
                            }
                            return m;
                        });
                        return { ...c, materials: updatedMaterials };
                    }
                    return c;
                });

                saveToDB(updatedList);

                // Send notification to teacher
                try {
                  await dbService.saveNotification({
                    id: `sub-${user.id}-${activeMaterial.id}-${Date.now()}`,
                    userId: activeClass.teacherId,
                    type: 'ASSIGNMENT_SUBMISSION',
                    title: 'הגשת מטלה חדשה',
                    message: `התלמיד/ה ${user.name} הגיש/ה את המטלה "${activeMaterial.title}" בכיתה ${activeClass.name}`,
                    timestamp: Date.now(),
                    isRead: false,
                    link: `CLASSROOM_SUBMISSION:${activeClass.id}:${activeMaterial.id}:${user.id}`,
                    classId: activeClass.id,
                    materialId: activeMaterial.id,
                    studentId: user.id
                  } as any);
                } catch (e) {
                  console.error("Failed to send notification", e);
                }

                setStudentQuizAnswers({});
                setIsSubmitting(false);
                alert(`הגשת בהצלחה! הציון שלך: ${aiScore}`);
                return;
            }
        } else if (activeMaterial.autoGradeByAI) {
            const submissionContent = `טקסט הגשה: ${studentSubmissionText}`;
            const result = await gradeOpenQuestion(
                activeMaterial.title, 
                activeMaterial.content, 
                submissionContent,
                studentSubmissionFile ? { mimeType: studentSubmissionFile.mimeType, data: studentSubmissionFile.data } : undefined
            );
            aiScore = result.score;
            aiFeedback = result.feedback;
        } else {
            aiScore = undefined;
            aiFeedback = "הגשתך התקבלה וממתינה לבדיקת המורה.";
        }

        const newSubmission: ClassroomSubmission = {
            id: Math.random().toString(36).substr(2, 9),
            studentId: user.id,
            studentName: user.name,
            timestamp: Date.now(),
            assignmentText: studentSubmissionText,
            quizResults: isTest ? studentQuizAnswers : undefined,
            attachment: studentSubmissionFile ? {
                name: studentSubmissionFile.name,
                mimeType: studentSubmissionFile.mimeType,
                data: studentSubmissionFile.data
            } : { name: '', mimeType: '', data: '' },
            aiScore,
            aiFeedback
        };

        const updatedClassrooms = allGlobalClassrooms.map(c => {
            if (c.id === activeClass.id) {
                const updatedMaterials = c.materials.map(m => {
                    if (m.id === activeMaterial.id) {
                        const updatedMat = { ...m, submissions: [...(m.submissions || []), newSubmission] };
                        setActiveMaterial(updatedMat);
                        return updatedMat;
                    }
                    return m;
                });
                return { ...c, materials: updatedMaterials };
            }
            return c;
        });

        saveToDB(updatedClassrooms);

        // Add to student history
        onAddHistoryItem({
          id: `hist-${Date.now()}`,
          timestamp: Date.now(),
          subject: activeClass.subject || '',
          grade: (activeClass.grade || Grade.GRADE_7) as Grade,
          type: activeMaterial.type === 'TEST' ? 'TEST' : 'ASSIGNMENT',
          title: activeMaterial.title,
          score: aiScore,
          classId: activeClass.id
        });

        // Send notification to teacher
        try {
          await dbService.saveNotification({
            id: `sub-${user.id}-${activeMaterial.id}-${Date.now()}`,
            userId: activeClass.teacherId,
            type: 'ASSIGNMENT_SUBMISSION',
            title: 'הגשת מטלה חדשה',
            message: `התלמיד/ה ${user.name} הגיש/ה את המטלה "${activeMaterial.title}" בכיתה ${activeClass.name}`,
            timestamp: Date.now(),
            isRead: false,
            link: `CLASSROOM_SUBMISSION:${activeClass.id}:${activeMaterial.id}:${user.id}`,
            classId: activeClass.id,
            materialId: activeMaterial.id,
            studentId: user.id
          } as any);
        } catch (e) {
          console.error("Failed to send notification", e);
        }

        setStudentSubmissionText('');
        setStudentSubmissionFile(null);
        setStudentQuizAnswers({});
        alert("הגשת המשימה בוצעה בהצלחה!");
    } catch (e) {
        alert("שגיאה בהגשת המשימה");
    } finally {
        setIsSubmitting(false);
    }
  };

  const userSubmission = useMemo(() => {
    if (!activeMaterial) return null;
    return activeMaterial.submissions?.find(s => s.studentId === user.id);
  }, [activeMaterial, user.id]);

  const handleGameFinish = async (score: number) => {
    if (!activeMaterial || !activeClass || userSubmission) return;
    
    setIsSubmitting(true);
    try {
      const newSubmission: ClassroomSubmission = {
        id: Math.random().toString(36).substr(2, 9),
        studentId: user.id,
        studentName: user.name,
        timestamp: Date.now(),
        aiScore: score,
        aiFeedback: `כל הכבוד! סיימת את המשחק בציון ${score}.`,
        attachment: { name: '', mimeType: '', data: '' }
      };

      const updatedList = allGlobalClassrooms.map(c => {
        if (c.id === activeClass.id) {
          const updatedMaterials = c.materials.map(m => {
            if (m.id === activeMaterial.id) {
              const updatedMat = { ...m, submissions: [...(m.submissions || []), newSubmission] };
              setActiveMaterial(updatedMat);
              return updatedMat;
            }
            return m;
          });
          return { ...c, materials: updatedMaterials };
        }
        return c;
      });

      saveToDB(updatedList);
      alert(`כל הכבוד! הציון שלך במשחק: ${score}`);
    } catch (e) {
      alert("שגיאה בשמירת תוצאת המשחק");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateManualScore = (submissionId: string, score: number) => {
      if (!activeClass || !activeMaterial) return;
      const updatedClassrooms = allGlobalClassrooms.map(c => {
        if (c.id === activeClass.id) {
          const updatedMaterials = c.materials.map(m => {
            if (m.id === activeMaterial.id) {
              const updatedSubmissions = m.submissions?.map(s => {
                if (s.id === submissionId) {
                  return { ...s, aiScore: score };
                }
                return s;
              });
              return { ...m, submissions: updatedSubmissions };
            }
            return m;
          });
          return { ...c, materials: updatedMaterials };
        }
        return c;
      });
      setAllGlobalClassrooms(updatedClassrooms);
      saveToDB(updatedClassrooms);
      localStorage.setItem(DB_KEY, JSON.stringify(updatedClassrooms));
      // Update local active material too
      const newActive = updatedClassrooms.find(c => c.id === activeClass.id)?.materials.find(m => m.id === activeMaterial.id);
      if (newActive) setActiveMaterial(newActive);
    };

    // Live lesson feature removed

    if (activeMaterial) {
      const isTestType = activeMaterial.type === 'TEST';
      const isAssignmentType = activeMaterial.type === 'ASSIGNMENT';
      const isTeacherView = isTeacherOfThisClass;

    return (
      <>
        <div className="bg-white animate-fade-in flex flex-col no-print min-h-[80vh] rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden" dir="rtl">
        <div className="h-16 bg-gray-900 text-white px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => { setActiveMaterial(null); setViewingSubmissionId(null); setEditingMaterial(false); }} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ArrowRight size={24}/></button>
            <h2 className="text-xl font-black">{activeMaterial.title}</h2>
          </div>
          <div className="flex items-center gap-3">
             {isTeacherView && (
               <div className="flex bg-white/10 p-1 rounded-xl ml-4">
                 {!['SUMMARY', 'UPLOADED_FILE', 'UPCOMING_TEST'].includes(activeMaterial.type) && (
                   <button 
                    onClick={() => setMaterialViewTab('SUBMISSIONS')} 
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${materialViewTab === 'SUBMISSIONS' ? 'bg-white text-gray-900' : 'text-white/60 hover:text-white'}`}
                   >
                     הגשות
                   </button>
                 )}
                 <button 
                  onClick={() => setMaterialViewTab('VIEW')} 
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${materialViewTab === 'VIEW' ? 'bg-white text-gray-900' : 'text-white/60 hover:text-white'}`}
                 >
                   צפייה ועריכה
                 </button>
               </div>
             )}
             <span className="text-xs font-black bg-primary px-3 py-1.5 rounded-full shadow-lg">{getHebrewType(activeMaterial.type)}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 md:p-10">
           <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden min-h-[70vh] flex flex-col">
              {isTeacherView && materialViewTab === 'SUBMISSIONS' ? (
                <div className="p-10 md:p-16">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3"><Users className="text-primary"/> ניהול הגשות וציונים</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                      <span className="bg-gray-100 px-3 py-1 rounded-lg">{activeMaterial.submissions?.length || 0} הגשות</span>
                      <span>/</span>
                      <span>{activeClass?.studentsCount || 0} תלמידים</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                          <th className="pb-6 pr-6">שם התלמיד</th>
                          <th className="pb-6">תאריך הגשה</th>
                          <th className="pb-6 text-center">סטטוס</th>
                          <th className="pb-6 text-center">ציון (AI/ידני)</th>
                          <th className="pb-6 text-left pl-6">פעולות</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {activeClass?.studentIds?.map((sid, idx) => {
                          const submission = activeMaterial.submissions?.find(s => s.studentId === sid);
                          const sName = activeClass.students?.[idx] || 'תלמיד';
                          return (
                            <React.Fragment key={sid}>
                              <tr className="group hover:bg-gray-50/50 transition-all">
                                <td className="py-6 pr-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center font-black text-xs uppercase">{sName[0]}</div>
                                    <span className="font-black text-gray-800">{sName}</span>
                                  </div>
                                </td>
                                <td className="py-6 text-sm font-bold text-gray-500">
                                  {submission ? new Date(submission.timestamp).toLocaleDateString('he-IL') : '--'}
                                </td>
                                <td className="py-6 text-center">
                                  {submission ? (
                                    <span className="bg-green-100 text-green-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">הוגש</span>
                                  ) : (
                                    <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase">טרם הוגש</span>
                                  )}
                                </td>
                                <td className="py-6 text-center">
                                  {submission ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <input 
                                        type="number" 
                                        min="0" 
                                        max="100" 
                                        value={submission.aiScore ?? ''} 
                                        onChange={(e) => handleUpdateManualScore(submission.id, parseInt(e.target.value))}
                                        className="w-16 p-2 bg-gray-50 border border-gray-200 rounded-xl text-center font-black text-primary outline-none focus:border-primary transition-all"
                                      />
                                    </div>
                                  ) : '--'}
                                </td>
                                <td className="py-6 text-left pl-6">
                                  {submission && (
                                    <button 
                                      onClick={() => setViewingSubmissionId(viewingSubmissionId === submission.id ? null : submission.id)}
                                      className="text-xs font-black text-primary hover:underline flex items-center gap-1"
                                    >
                                      {viewingSubmissionId === submission.id ? 'סגור פירוט' : 'צפה בתשובות'}
                                      <ChevronLeft size={14} className={viewingSubmissionId === submission.id ? 'rotate-90' : ''}/>
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {viewingSubmissionId === submission?.id && (
                                <tr>
                                  <td colSpan={5} className="p-0">
                                    <div className="bg-gray-50 p-8 rounded-3xl m-4 border border-gray-100 animate-slide-up">
                                      <h5 className="font-black text-gray-900 mb-6 flex items-center gap-2"><FileText size={18}/> פירוט תשובות התלמיד</h5>
                                      
                                      {submission.text && (
                                        <div className="bg-white p-6 rounded-2xl border border-gray-100 mb-6">
                                          <div className="text-[10px] font-black text-gray-400 uppercase mb-2">תוכן ההגשה:</div>
                                          <div className="text-gray-700 leading-relaxed"><LatexRenderer text={submission.text} /></div>
                                        </div>
                                      )}

                                      {submission.detailedResults && (
                                        <div className="space-y-4">
                                          {submission.detailedResults.map((res: any, ri: number) => (
                                            <div key={ri} className="bg-white p-6 rounded-2xl border border-gray-100">
                                              <div className="flex items-center justify-between mb-3">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">שאלה {ri + 1}</span>
                                                {res.isCorrect ? <CheckCircle2 size={16} className="text-green-500"/> : <X size={16} className="text-red-500"/>}
                                              </div>
                                              <div className="font-bold text-gray-800 mb-3">
                                                <LatexRenderer text={activeMaterial.questions?.find(q => q.id === res.questionId)?.text || res.questionId} />
                                              </div>
                                              <div className="grid md:grid-cols-2 gap-4">
                                                <div className="p-3 bg-gray-50 rounded-xl">
                                                  <div className="text-[8px] font-black text-gray-400 uppercase mb-1">תשובת תלמיד</div>
                                                  <div className="text-sm font-bold text-gray-700">
                                                    <LatexRenderer text={res.studentAnswer || 'לא נענה'} />
                                                  </div>
                                                </div>
                                                <div className="p-3 bg-green-50 rounded-xl">
                                                  <div className="text-[8px] font-black text-green-400 uppercase mb-1">תשובה נכונה</div>
                                                  <div className="text-sm font-bold text-green-700">{res.correctAnswer}</div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {submission.file && (
                                        <a href={`data:${submission.file.mimeType};base64,${submission.file.data}`} download={submission.file.name} className="mt-6 flex items-center gap-3 p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 hover:bg-white transition-all w-fit">
                                          <Paperclip size={18}/>
                                          <span className="font-bold text-xs">{submission.file.name}</span>
                                        </a>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : isTeacherView && activeMaterial.type === 'GAME' ? (
                <div className="p-10 md:p-16">
                   <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                      <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3"><Trophy className="text-amber-500"/> דירוג כיתתי - Top 5</h3>
                    </div>
                    <div className="p-8">
                      {activeMaterial.submissions?.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0)).slice(0, 5).map((sub, idx) => (
                        <div key={sub.id} className={`flex items-center justify-between p-4 rounded-2xl mb-2 bg-gray-50`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-gray-300 text-white' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-white text-gray-400'}`}>
                              {idx + 1}
                            </div>
                            <span className="font-black text-gray-900">{sub.studentName}</span>
                          </div>
                          <div className="text-xl font-black text-indigo-600">{sub.aiScore}</div>
                        </div>
                      ))}
                      {(!activeMaterial.submissions || activeMaterial.submissions.length === 0) && (
                        <p className="text-center text-gray-400 font-bold py-10">אין עדיין תוצאות למשחק זה בכיתה.</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-12 p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                    <h4 className="font-black text-gray-800 mb-4">תצוגה מקדימה של המשחק</h4>
                    <button 
                      onClick={() => setIsPlayingGame(true)}
                      className="bg-white text-gray-900 border border-gray-200 px-6 py-3 rounded-xl font-black text-sm hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                      <Play size={16} />
                      <span>הפעל תצוגה מקדימה</span>
                    </button>
                  </div>

                  {isPlayingGame && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10">
                      <div className="w-full max-w-5xl animate-scale-in">
                        <GameRunner 
                          game={{
                            id: activeMaterial.id,
                            title: activeMaterial.title,
                            type: activeMaterial.gameType || 'MEMORY',
                            subject: activeMaterial.subject as Subject,
                            grade: activeMaterial.grade as Grade,
                            content: activeMaterial.gameContent,
                            timestamp: activeMaterial.timestamp
                          }}
                          onFinish={() => setIsPlayingGame(false)}
                          onCancel={() => setIsPlayingGame(false)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : activeMaterial.type === 'GAME' && !isTeacherView ? (
                <div className="p-10 md:p-16">
                  {!userSubmission ? (
                    <div className="max-w-4xl mx-auto">
                      <div className="bg-purple-50 p-8 rounded-[2.5rem] border border-purple-100 mb-12 text-center">
                        <div className="bg-purple-600 text-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                          <Gamepad2 size={40} />
                        </div>
                        <h3 className="text-3xl font-black text-purple-900 mb-4">מוכנים לשחק?</h3>
                        <p className="text-purple-700 font-bold text-lg mb-8">המורה הכין עבורכם משחק למידה אינטראקטיבי בנושא {activeMaterial.title}</p>
                        
                        <button 
                          onClick={() => setIsPlayingGame(true)}
                          className="bg-purple-600 text-white px-12 py-4 rounded-2xl font-black text-xl hover:bg-purple-700 transition-all shadow-xl flex items-center gap-3 mx-auto"
                        >
                          <Play size={24} />
                          <span>התחל משחק</span>
                        </button>
                      </div>

                      {isPlayingGame && (
                        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10">
                          <div className="w-full max-w-5xl animate-scale-in">
                            <GameRunner 
                              game={{
                                id: activeMaterial.id,
                                title: activeMaterial.title,
                                type: activeMaterial.gameType || 'MEMORY',
                                subject: activeMaterial.subject as Subject,
                                grade: activeMaterial.grade as Grade,
                                content: activeMaterial.gameContent,
                                timestamp: activeMaterial.timestamp
                              }}
                              onFinish={(score) => {
                                handleGameFinish(score);
                                setIsPlayingGame(false);
                              }}
                              onCancel={() => setIsPlayingGame(false)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="max-w-2xl mx-auto text-center py-20">
                      <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 mb-4">כבר שיחקת במשחק זה!</h3>
                      <div className="text-5xl font-black text-primary mb-2">{userSubmission.aiScore}</div>
                      <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">הציון שלך</div>
                      <p className="text-gray-500 font-medium mb-8">{userSubmission.aiFeedback}</p>
                      <button onClick={() => setIsPlayingGame(true)} className="text-primary font-black hover:underline">שחק שוב (הציון לא יתעדכן)</button>
                      
                      {isPlayingGame && (
                        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10">
                          <div className="w-full max-w-5xl animate-scale-in">
                            <GameRunner 
                              game={{
                                id: activeMaterial.id,
                                title: activeMaterial.title,
                                type: activeMaterial.gameType || 'MEMORY',
                                subject: activeMaterial.subject as Subject,
                                grade: activeMaterial.grade as Grade,
                                content: activeMaterial.gameContent,
                                timestamp: activeMaterial.timestamp
                              }}
                              onFinish={() => setIsPlayingGame(false)}
                              onCancel={() => setIsPlayingGame(false)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-10 md:p-20 flex-1 leading-relaxed text-lg text-gray-700">
                  {isTeacherView && !editingMaterial && (
                    <div className="flex justify-end mb-8 gap-3">
                      <button 
                        onClick={() => {
                          setEditingMaterial(true);
                          setWorkspaceOpen(true);
                        }}
                        className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2 rounded-xl font-black text-xs shadow-lg hover:bg-black transition-all"
                      >
                        <Edit3 size={16}/>
                        ערוך תוכן
                      </button>
                    </div>
                  )}

                  {editingMaterial ? null : (
                    <>
                      <div className="mb-12 pb-8 border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-2 mb-6">
                            <span className="bg-indigo-50 text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{activeMaterial.subject}</span>
                            <span className="bg-gray-100 text-gray-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{activeMaterial.grade}</span>
                            <span className="text-gray-400 text-xs font-bold mr-2 flex items-center gap-1">
                                <UserIcon size={12} className="text-primary"/> 
                                מאת: {activeMaterial.authorName || 'מורה אורח'} • {new Date(activeMaterial.timestamp).toLocaleDateString('he-IL')}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 leading-tight">{activeMaterial.title}</h1>
                        <div className="flex flex-wrap items-center gap-6 text-gray-400 font-bold">
                            {activeMaterial.dueDate && <div className="flex items-center gap-2 text-orange-500 bg-orange-50 px-3 py-1 rounded-lg"><Calendar size={18}/><span>להגשה עד: {new Date(activeMaterial.dueDate).toLocaleDateString('he-IL')}</span></div>}
                        </div>
                      </div>

                      <article className="prose prose-lg max-w-none prose-indigo mb-10">
                        {activeMaterial.pages && activeMaterial.pages.length > 0 ? (
                          <>
                            <div key={activeMaterial.pages[activeViewerPageIndex].id} className="mb-12">
                              <h4 className="text-2xl font-black text-gray-900 mb-6 border-b-2 border-indigo-100 pb-2">עמוד {activeViewerPageIndex + 1} מתוך {activeMaterial.pages.length}</h4>
                              {activeMaterial.pages[activeViewerPageIndex].blocks.map((block) => {
                                if (block.type === 'VIDEO') {
                                  let videoUrl = block.content;
                                  if (videoUrl.includes('youtube.com/watch?v=')) {
                                    videoUrl = videoUrl.replace('watch?v=', 'embed/');
                                  } else if (videoUrl.includes('youtu.be/')) {
                                    videoUrl = videoUrl.replace('youtu.be/', 'youtube.com/embed/');
                                  }
                                  return (
                                    <div key={block.id} className="mb-8 rounded-3xl overflow-hidden shadow-lg border border-gray-100">
                                      <iframe 
                                        width="100%" 
                                        height="400" 
                                        src={videoUrl} 
                                        title="Video player" 
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                        className="w-full"
                                      ></iframe>
                                    </div>
                                  );
                                }
                                if (block.type === 'IMAGE') {
                                  return (
                                    <div key={block.id} className="mb-8 rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                                      <img src={block.content} alt="Content" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                  );
                                }
                                if (block.type === 'LINK') {
                                  return (
                                    <div key={block.id} className="mb-8">
                                      <a href={block.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-colors font-bold">
                                        <Link size={20} />
                                        {block.content}
                                      </a>
                                    </div>
                                  );
                                }
                                if (block.type === 'GAME') {
                                  let gameData = { gameType: 'MEMORY', gameContent: null };
                                  try {
                                    if (block.content) gameData = JSON.parse(block.content);
                                  } catch (e) {
                                    console.error("Failed to parse game data", e);
                                  }
                                  return (
                                    <div key={block.id} className="mb-8 p-8 bg-purple-50 rounded-3xl border border-purple-100 text-center">
                                      <Gamepad2 size={40} className="mx-auto text-purple-600 mb-4" />
                                      <h3 className="text-2xl font-black text-purple-900 mb-4">משחק למידה</h3>
                                      <button 
                                        onClick={() => {
                                          setActiveMaterial({...activeMaterial, gameType: gameData.gameType as GameType, gameContent: gameData.gameContent});
                                          setIsPlayingGame(true);
                                        }}
                                        className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 transition-all"
                                      >
                                        שחק עכשיו
                                      </button>
                                    </div>
                                  );
                                }
                                if (block.type === 'UPCOMING_TEST') {
                                  return (
                                    <div key={block.id} className="mb-8 p-6 bg-orange-50 rounded-3xl border border-orange-100 flex items-center gap-4">
                                      <div className="bg-orange-100 p-4 rounded-full text-orange-600"><BellRing size={32}/></div>
                                      <div>
                                        <h3 className="text-xl font-black text-orange-900 mb-1">התראה על מבחן מתקרב</h3>
                                        <p className="text-orange-700 font-bold">{block.content}</p>
                                      </div>
                                    </div>
                                  );
                                }
                                if (block.type === 'FILE') {
                                  let fileData: any = {};
                                  try {
                                    if (block.content) fileData = JSON.parse(block.content);
                                  } catch (e) {
                                    console.error("Failed to parse file data", e);
                                  }
                                  return (
                                    <div key={block.id} className="mb-8 p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="bg-blue-100 p-4 rounded-full text-blue-600"><FileText size={32}/></div>
                                        <div>
                                          <h3 className="text-xl font-black text-blue-900 mb-1">{fileData.name || 'קובץ מצורף'}</h3>
                                          <p className="text-blue-700 font-bold text-sm">לחץ להורדה</p>
                                        </div>
                                      </div>
                                      {fileData.data && (
                                        <a href={fileData.data} download={fileData.name} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all">
                                          <Download size={24}/>
                                        </a>
                                      )}
                                    </div>
                                  );
                                }
                                if (block.type === 'TEXT' || block.type === 'SUMMARY') {
                                  return (
                                    <div key={block.id} className="mb-8 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                      <div className="prose prose-indigo max-w-none">
                                        <LatexRenderer text={block.content} />
                                      </div>
                                    </div>
                                  );
                                }
                                if (block.type === 'TEST') {
                                  const questions = block.questions || [];
                                  return (
                                    <div key={block.id} className="mb-12 space-y-8 p-8 bg-green-50/30 rounded-[2.5rem] border border-green-100">
                                      <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-green-100 p-2 rounded-xl text-green-600"><ListChecks size={24}/></div>
                                        <h3 className="text-xl font-black text-green-900">שאלות תרגול</h3>
                                      </div>
                                      <div className="space-y-6">
                                        {questions.map((q, qIdx) => (
                                          <div key={q.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="flex items-start gap-3 mb-4">
                                              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center font-black text-primary text-sm shrink-0">{qIdx + 1}</div>
                                              <h4 className="font-bold text-gray-800 pt-1"><LatexRenderer text={q.text} /></h4>
                                            </div>
                                            {q.type === 'MCQ' ? (
                                              <div className="grid gap-2">
                                                {q.options.map((opt, oi) => {
                                                  const isSelected = studentQuizAnswers[q.id] === oi;
                                                  const isCorrect = oi === q.correctIndex;
                                                  const isRevealed = revealedAnswers[q.id];
                                                  return (
                                                    <button 
                                                      key={oi}
                                                      onClick={() => {
                                                        if (!isRevealed) {
                                                          setStudentQuizAnswers(prev => ({...prev, [q.id]: oi}));
                                                        }
                                                      }}
                                                      className={`w-full p-3 rounded-xl border-2 text-right transition-all flex items-center gap-3 ${
                                                        isRevealed 
                                                          ? (isCorrect ? 'border-green-500 bg-green-50 text-green-700' : (isSelected ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-50 opacity-50'))
                                                          : (isSelected ? 'border-primary bg-blue-50 text-primary' : 'bg-gray-50 border-transparent hover:border-gray-200')
                                                      }`}
                                                    >
                                                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`} />
                                                      <LatexRenderer text={opt} />
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            ) : (
                                              <div className="space-y-3">
                                                <textarea 
                                                  value={studentQuizAnswers[q.id] || ''}
                                                  onChange={e => setStudentQuizAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                                                  disabled={revealedAnswers[q.id]}
                                                  placeholder="הקלד תשובה..."
                                                  className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary outline-none font-medium text-sm transition-all"
                                                  rows={3}
                                                />
                                              </div>
                                            )}
                                            
                                            {revealedAnswers[q.id] ? (
                                              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-fade-in">
                                                <div className="flex items-center gap-2 mb-2 text-blue-700 font-black text-xs">
                                                  <Bot size={14}/> הסבר פתרון:
                                                </div>
                                                <div className="text-sm text-blue-800 leading-relaxed">
                                                  {q.type === 'OPEN' && <div className="font-black mb-2">תשובת מודל: <LatexRenderer text={q.modelAnswer || ''} /></div>}
                                                  <LatexRenderer text={q.explanation} />
                                                </div>
                                              </div>
                                            ) : (
                                              <button 
                                                onClick={() => setRevealedAnswers(prev => ({...prev, [q.id]: true}))}
                                                className="mt-4 w-full py-2 bg-primary/10 text-primary rounded-xl font-black text-xs hover:bg-primary hover:text-white transition-all"
                                              >
                                                בדוק תשובה
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          </>
                        ) : (
                          <LatexRenderer text={activeMaterial.content} />
                        )}
                      </article>

                      {activeMaterial.questions && activeMaterial.questions.length > 0 && (!isTestType || isTeacherView) && (
                        <div className="mt-12 pt-12 border-t border-gray-100 space-y-8">
                          <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3"><ListChecks className="text-primary"/> שאלות תרגול</h3>
                          <div className="grid gap-6">
                            {activeMaterial.questions.map((q, idx) => (
                              <div key={q.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                <div className="flex items-start gap-4 mb-6">
                                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center font-black text-primary border border-gray-100">{idx+1}</div>
                                  <h4 className="text-xl font-black text-gray-800 pt-1"><LatexRenderer text={q.text} /></h4>
                                </div>
                                {q.type === 'MCQ' ? (
                                  <div className="grid md:grid-cols-2 gap-3">
                                    {q.options.map((opt, oi) => {
                                      const isSelected = studentQuizAnswers[q.id] === oi;
                                      const isCorrect = oi === q.correctIndex;
                                      const isRevealed = revealedAnswers[q.id] || isTeacherView;
                                      return (
                                        <button 
                                          key={oi}
                                          onClick={() => {
                                            if (!isRevealed && !isTeacherView) {
                                              setStudentQuizAnswers(prev => ({...prev, [q.id]: oi}));
                                            }
                                          }}
                                          className={`p-4 rounded-2xl border-2 text-right transition-all flex items-center gap-3 ${
                                            isRevealed 
                                              ? (isCorrect ? 'border-green-500 bg-green-50 text-green-700' : (isSelected ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-50 opacity-50'))
                                              : (isSelected ? 'border-primary bg-blue-50 text-primary' : 'bg-gray-50 border-transparent hover:border-gray-200')
                                          }`}
                                        >
                                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`} />
                                          <LatexRenderer text={opt} />
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <textarea 
                                      value={studentQuizAnswers[q.id] || ''}
                                      onChange={e => setStudentQuizAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                                      disabled={revealedAnswers[q.id] || isTeacherView}
                                      placeholder="הקלד תשובה..."
                                      className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary outline-none font-medium text-sm transition-all"
                                      rows={3}
                                    />
                                  </div>
                                )}
                                
                                {revealedAnswers[q.id] || isTeacherView ? (
                                  <div className="mt-6 p-6 bg-blue-50 rounded-[2rem] border border-blue-100 animate-fade-in">
                                    <div className="flex items-center gap-2 mb-3 text-blue-700 font-black text-xs">
                                      <Bot size={16}/> הסבר פתרון:
                                    </div>
                                    <div className="text-sm text-blue-800 leading-relaxed">
                                      {q.type === 'OPEN' && <div className="font-black mb-2">תשובת מודל: <LatexRenderer text={q.modelAnswer || ''} /></div>}
                                      <LatexRenderer text={q.explanation} />
                                    </div>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setRevealedAnswers(prev => ({...prev, [q.id]: true}))}
                                    className="mt-6 w-full py-3 bg-primary/10 text-primary rounded-2xl font-black text-sm hover:bg-primary hover:text-white transition-all shadow-sm"
                                  >
                                    בדוק תשובה
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isTeacherView && userSubmission && isTestType && (
                        <div className="mt-12 pt-12 border-t border-gray-100">
                          <div className="bg-indigo-50 p-8 rounded-[2.5rem] border-2 border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                              <div className="bg-indigo-500 p-4 rounded-3xl text-white shadow-lg"><CheckCircle2 size={32}/></div>
                              <div>
                                <h3 className="text-2xl font-black text-gray-900">העבודה הוגשה</h3>
                                <p className="text-indigo-700 font-bold">כבר הגשת את המבחן הזה. תוכל לצפות בתשובות ובמשוב שלך.</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                const el = document.getElementById('submission-view');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-600 transition-all flex items-center gap-2"
                            >
                              <FileText size={20}/>
                              צפה בהגשה שלי
                            </button>
                          </div>
                        </div>
                      )}

                      {activeMaterial.teacherAttachments && activeMaterial.teacherAttachments.length > 0 && (
                          <div className="mt-10 pt-10 border-t border-gray-100">
                            <h4 className="text-2xl font-black mb-8 flex items-center gap-3"><Paperclip className="text-primary"/> קבצים מצורפים</h4>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {activeMaterial.teacherAttachments.map((f, i) => (
                                    <a key={i} href={`data:${f.mimeType};base64,${f.data}`} download={f.name} className="flex items-center justify-between p-6 bg-blue-50 rounded-3xl border border-blue-100 hover:border-blue-500 hover:bg-white transition-all group shadow-sm">
                                        <div className="flex items-center gap-4"><div className="bg-white p-3 rounded-2xl text-blue-500 shadow-sm"><FileDown /></div><span className="font-bold truncate text-gray-800">{f.name}</span></div>
                                        <ChevronLeft size={20} className="text-blue-300 group-hover:text-blue-500 transition-colors"/>
                                    </a>
                                ))}
                            </div>
                          </div>
                      )}

                      {!isTeacherView && activeMaterial.type === 'UPCOMING_TEST' && (
                        <div className="mt-10 p-8 bg-amber-50 rounded-[2.5rem] border-2 border-amber-100 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className="bg-amber-500 p-4 rounded-3xl text-white shadow-lg"><Calendar size={32}/></div>
                            <div>
                              <h3 className="text-2xl font-black text-gray-900">הכנה למבחן</h3>
                              <p className="text-amber-700 font-bold">המורה פרסם הכנה למבחן. התחל ללמוד עכשיו!</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const testDate = activeMaterial.dueDate ? new Date(activeMaterial.dueDate) : new Date();
                              const today = new Date();
                              let diffDays = Math.ceil((testDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              if (diffDays < 1) diffDays = 1;
                              if (diffDays > 14) diffDays = 14;
                              
                              onStartTestPrep(
                                activeClass!.subject as Subject, 
                                activeClass!.grade as Grade, 
                                activeMaterial.content || activeMaterial.title, 
                                diffDays, 
                                activeMaterial.teacherAttachments?.[0]
                              );
                            }}
                            className="bg-amber-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-amber-600 transition-all flex items-center gap-2"
                          >
                            <Zap size={20}/>
                            התחל הכנה למבחן
                          </button>
                        </div>
                      )}

                      {!isTeacherView && (isAssignmentType || isTestType) && (
                        <div className="mt-20 pt-16 border-t-2 border-dashed border-gray-200">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="bg-primary p-4 rounded-3xl text-white shadow-lg">{isTestType ? <ListChecks size={32}/> : <ClipboardCheck size={32}/>}</div>
                                <div>
                                    <h3 className="text-3xl font-black text-gray-900">{isTestType ? 'פתרון המבחן/תרגול' : 'הגשת המטלה'}</h3>
                                    <p className="text-gray-500 font-bold">{userSubmission ? 'העבודה הוגשה' : 'מלא את התשובות שלך כאן'}</p>
                                </div>
                            </div>

                            {userSubmission ? (
                                <div id="submission-view" className="bg-green-50 p-10 rounded-[3rem] border-2 border-green-100 text-center animate-fade-in">
                                    <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 shadow-sm"><CheckCircle2 size={40}/></div>
                                    <h4 className="text-2xl font-black text-green-800 mb-2">בוצע בהצלחה!</h4>
                                    <p className="text-green-600 font-bold mb-8">{new Date(userSubmission.timestamp).toLocaleString('he-IL')}</p>
                                    
                                    <div className="flex flex-wrap justify-center gap-4 mb-10">
                                      <button 
                                        onClick={() => {
                                          const el = document.getElementById('my-submission-content');
                                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                                          setShowMySubmissionContent(!showMySubmissionContent);
                                        }}
                                        className="bg-white text-green-600 border-2 border-green-200 px-8 py-3 rounded-2xl font-black hover:bg-green-50 transition-all flex items-center gap-2"
                                      >
                                        <FileText size={20}/>
                                        {showMySubmissionContent ? 'הסתר את ההגשה שלי' : 'צפה בהגשה שלי'}
                                      </button>
                                    </div>

                                    {showMySubmissionContent && (
                                      <div id="my-submission-content" className="bg-white p-8 rounded-[2.5rem] border border-green-100 mb-10 text-right animate-slide-up">
                                        <h5 className="text-xl font-black mb-4 text-gray-800">התוכן שהגשת:</h5>
                                        {userSubmission.assignmentText && (
                                          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6 text-gray-700 leading-relaxed">
                                            <LatexRenderer text={userSubmission.assignmentText} />
                                          </div>
                                        )}
                                        {userSubmission.attachment && userSubmission.attachment.data && (
                                          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                            <div className="bg-white p-3 rounded-xl text-blue-500 shadow-sm"><FileDown /></div>
                                            <div className="flex-1">
                                              <div className="font-bold text-gray-800">{userSubmission.attachment.name}</div>
                                              <div className="text-xs text-gray-400">{userSubmission.attachment.mimeType}</div>
                                            </div>
                                            <a 
                                              href={`data:${userSubmission.attachment.mimeType};base64,${userSubmission.attachment.data}`} 
                                              download={userSubmission.attachment.name}
                                              className="bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-600 transition-all"
                                            >
                                              הורד קובץ
                                            </a>
                                          </div>
                                        )}
                                        {isTestType && (
                                          <div className="text-sm text-gray-500 font-bold">
                                            התשובות שלך לשאלות המבחן מופיעות בפירוט למטה.
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {userSubmission.aiScore !== undefined ? (
                                        <div className="space-y-12">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                                <div className="bg-white p-8 rounded-3xl border border-green-200 shadow-sm flex flex-col items-center justify-center">
                                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ציון סופי</div>
                                                    <div className="text-5xl font-black text-primary">{userSubmission.aiScore}</div>
                                                </div>
                                                <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-green-200 shadow-sm text-right">
                                                    <div className="flex items-center gap-2 mb-3 text-primary font-black"><Bot size={18}/> משוב מהמורה הדיגיטלי:</div>
                                                    <div className="text-gray-700 font-bold text-lg leading-relaxed">
                                                        <LatexRenderer text={userSubmission.aiFeedback || ''} />
                                                    </div>
                                                </div>
                                            </div>

                                            {isTestType && (userSubmission as any).detailedResults && (
                                                <div className="space-y-8 text-right">
                                                    <div className="flex items-center gap-4 mb-8">
                                                        <div className="h-px flex-1 bg-gray-200"></div>
                                                        <h4 className="text-2xl font-black text-gray-800">סקירת שאלות ותשובות</h4>
                                                        <div className="h-px flex-1 bg-gray-200"></div>
                                                    </div>
                                                    
                                                    <div className="grid gap-8">
                                                        {activeMaterial.questions?.map((q, idx) => {
                                                            const result = (userSubmission as any).detailedResults?.find((r: any) => r.questionId === q.id);
                                                            return (
                                                                <div key={q.id} className={`p-8 rounded-[2.5rem] border-2 bg-white shadow-sm transition-all hover:shadow-md ${result?.isCorrect ? 'border-green-100' : 'border-red-100'}`}>
                                                                    <div className="flex items-start gap-4 mb-6">
                                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg shrink-0 ${result?.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                                                            {result?.isCorrect ? <CheckCircle2 size={24}/> : <X size={24}/>}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">שאלה {idx + 1}</div>
                                                                            <h5 className="text-xl font-black text-gray-800 leading-tight"><LatexRenderer text={q.text} /></h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                                                                        <div className={`p-5 rounded-2xl border transition-all ${result?.isCorrect ? 'bg-green-50/30 border-green-100' : 'bg-red-50/30 border-red-100'}`}>
                                                                            <div className={`text-[10px] font-black uppercase mb-2 ${result?.isCorrect ? 'text-green-400' : 'text-red-400'}`}>התשובה שלך</div>
                                                                            <div className={`font-bold text-lg ${result?.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                                                                <LatexRenderer text={result?.studentAnswer || 'לא נענה'} />
                                                                            </div>
                                                                        </div>
                                                                        {!result?.isCorrect && (
                                                                            <div className="p-5 rounded-2xl border border-green-100 bg-green-50/30">
                                                                                <div className="text-[10px] font-black text-green-400 uppercase mb-2">התשובה הנכונה</div>
                                                                                <div className="font-bold text-lg text-green-700">
                                                                                    <LatexRenderer text={result?.correctAnswer || ''} />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 relative overflow-hidden group">
                                                                        <div className="absolute top-0 right-0 w-1 h-full bg-primary opacity-20 group-hover:opacity-100 transition-opacity"></div>
                                                                        <div className="flex items-center gap-2 mb-3 text-primary font-black text-xs"><Bot size={16}/> הסבר ומשוב:</div>
                                                                        <div className="text-sm text-gray-600 leading-relaxed font-medium">
                                                                            <LatexRenderer text={result?.explanation || ''} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-orange-200 text-orange-600 font-black shadow-sm mb-6">
                                            ממתין לבדיקת המורה...
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-8 animate-slide-up">
                                    {isTestType ? (
                                        <div className="space-y-10">
                                            {activeMaterial.questions?.map((q, idx) => (
                                                <div key={q.id} className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                                    <div className="flex items-start gap-4 mb-6">
                                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-primary border border-gray-100">{idx+1}</div>
                                                        <h4 className="text-xl font-black text-gray-800 pt-1"><LatexRenderer text={q.text} /></h4>
                                                    </div>
                                                    
                                                    {q.type === 'MCQ' ? (
                                                        <div className="grid gap-3">
                                                            {q.options.map((opt, oi) => (
                                                                <button 
                                                                    key={oi} 
                                                                    onClick={() => setStudentQuizAnswers(prev => ({...prev, [q.id]: oi}))}
                                                                    className={`w-full p-4 rounded-2xl border-2 text-right transition-all flex items-center gap-4 ${studentQuizAnswers[q.id] === oi ? 'border-primary bg-blue-50 text-primary shadow-md' : 'bg-white border-gray-50 hover:border-gray-200'}`}
                                                                >
                                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${studentQuizAnswers[q.id] === oi ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>
                                                                        {studentQuizAnswers[q.id] === oi && <div className="w-2 h-2 bg-white rounded-full"/>}
                                                                    </div>
                                                                    <LatexRenderer text={opt} />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <RichEditor 
                                                            value={studentQuizAnswers[q.id] || ''} 
                                                            onChange={val => setStudentQuizAnswers(prev => ({...prev, [q.id]: val}))} 
                                                            placeholder="הקלד את התשובה שלך כאן..." 
                                                            minHeight="150px"
                                                            minimalMode={false}
                                                            hideInteractive={true}
                                                            subject={activeMaterial.subject}
                                                            stickyOffset="top-16"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 p-8 shadow-sm focus-within:border-primary transition-all">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4 pr-1">כתיבת תשובה ישירות כאן</label>
                                            <RichEditor 
                                                value={studentSubmissionText} 
                                                onChange={setStudentSubmissionText} 
                                                placeholder="הקלד כאן את הפתרון שלך למטלה..." 
                                                minHeight="300px"
                                                minimalMode={false}
                                                hideInteractive={true}
                                                subject={activeMaterial.subject}
                                                stickyOffset="top-16"
                                            />
                                        </div>
                                    )}

                                    <div className="flex flex-col md:flex-row items-center gap-6">
                                        {!isTestType && (
                                          <div className="flex-1 w-full">
                                              <button 
                                                  onClick={() => studentFileRef.current?.click()}
                                                  className={`w-full flex items-center justify-center gap-3 p-6 rounded-3xl border-2 border-dashed transition-all ${studentSubmissionFile ? 'bg-blue-50 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-primary hover:bg-white'}`}
                                              >
                                                  {studentSubmissionFile ? <FileText size={24}/> : <Upload size={24}/>}
                                                  <span className="font-black">{studentSubmissionFile ? studentSubmissionFile.name : 'צרוף קובץ (אופציונלי)'}</span>
                                              </button>
                                              <input 
                                                  type="file" 
                                                  ref={studentFileRef} 
                                                  className="hidden" 
                                                  onChange={e => {
                                                      if(e.target.files && e.target.files[0]) {
                                                          const file = e.target.files[0];
                                                          const r = new FileReader();
                                                          r.onloadend = () => setStudentSubmissionFile({name: file.name, data: (r.result as string).split(',')[1], mimeType: file.type});
                                                          r.readAsDataURL(file);
                                                      }
                                                  }}
                                              />
                                          </div>
                                        )}
                                        <button 
                                            onClick={handleStudentSubmit}
                                            disabled={isSubmitting}
                                            className={`bg-gray-900 text-white px-16 py-6 rounded-3xl font-black text-xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed ${isTestType ? 'w-full' : ''}`}
                                        >
                                            {isSubmitting ? <Loader2 size={24} className="animate-spin"/> : <Send size={24}/>}
                                            <span>שלח והגש הכל</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                      )}

                      {activeMaterial.pages && activeMaterial.pages.length > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-12 pt-8 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setActiveViewerPageIndex(prev => Math.max(0, prev - 1));
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={activeViewerPageIndex === 0}
                            className="px-8 py-3 rounded-2xl font-black bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-all shadow-sm"
                          >
                            הקודם
                          </button>
                          <span className="font-black text-gray-500 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                            {activeViewerPageIndex + 1} / {activeMaterial.pages.length}
                          </span>
                          <button
                            onClick={() => {
                              setActiveViewerPageIndex(prev => Math.min(activeMaterial.pages!.length - 1, prev + 1));
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={activeViewerPageIndex === activeMaterial.pages.length - 1}
                            className="px-8 py-3 rounded-2xl font-black bg-primary text-white hover:bg-blue-600 disabled:opacity-50 transition-all shadow-lg"
                          >
                            הבא
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
           </div>
        </div>
      </div>
      {workspaceOpen && activeClass && (
        <GlobalContentEditor
          user={user}
          onClose={handleCloseWorkspace}
          onPublish={handlePublish}
          classrooms={allGlobalClassrooms}
          initialMaterial={editingMaterial ? activeMaterial : null}
          initialSelectedClassIds={[activeClass.id]}
          onUpdateUser={onUpdateUser}
          isPro={isPro}
          checkAndIncrementAiLimit={checkAndIncrementAiLimit}
          title={editingMaterial ? 'עריכת חומר למידה' : 'מרחב הכנת תוכן לכיתה'}
        />
      )}
      </>
    );
  }

  return (
    <div className="w-full min-h-full text-right bg-gray-50" dir="rtl">
      <div className="animate-fade-in space-y-8">
        {activeClass ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-6">
                    <button onClick={() => { setActiveClassId(null); setActiveMaterial(null); }} className="p-4 bg-gray-50 hover:bg-primary hover:text-white rounded-3xl transition-all group"><ArrowRight size={24}/></button>
                    <div>
                      <h2 className="text-3xl font-black text-gray-900">{activeClass.name}</h2>
                      <div className="flex items-center gap-2 mt-1 text-gray-400 font-bold text-sm">
                        {isTeacherOfThisClass && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">מצב מורה</span>}
                        <span>{activeClass.subject}</span><span>•</span><span>{activeClass.grade}</span>
                      </div>
                    </div>
                </div>
                    <div className="flex bg-gray-50 p-1.5 rounded-3xl shadow-inner border border-gray-100 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('MATERIALS')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 ${activeTab === 'MATERIALS' ? 'bg-white text-primary shadow-md' : 'text-gray-400 hover:bg-white/50'}`}>חומרים</button>
                    <button onClick={() => setActiveTab('CHAT')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 ${activeTab === 'CHAT' ? 'bg-white text-primary shadow-md' : 'text-gray-400 hover:bg-white/50'}`}>צ'אט</button>
                    {isTeacherOfThisClass && (
                        <>
                            <button onClick={() => { setActiveTab('STUDENTS'); setViewingStudentId(null); setStudentAIInsight(null); }} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 ${activeTab === 'STUDENTS' ? 'bg-white text-primary shadow-md' : 'text-gray-400 hover:bg-white/50'}`}>תלמידים</button>
                            <button onClick={() => setActiveTab('ANALYTICS')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 ${activeTab === 'ANALYTICS' ? 'bg-white text-primary shadow-md' : 'text-gray-400 hover:bg-white/50'}`}>אנליטיקה</button>
                        </>
                    )}
                </div>
            </div>

            {activeTab === 'MATERIALS' ? (
                <div className="grid lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xl font-black text-gray-800">חומרי למידה</h3>
                            {isTeacherOfThisClass && <button onClick={() => setWorkspaceOpen(true)} className="bg-primary text-white px-6 py-2.5 rounded-2xl text-sm font-black shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2"><PlusCircle size={18}/> הוסף תוכן</button>}
                        </div>
                        <div className="grid gap-4">
                  {(!activeClass.materials || activeClass.materials.length === 0) ? <div className="bg-white p-20 rounded-[2rem] text-center text-gray-300 font-bold border-2 border-dashed border-gray-100">אין חומרים בכיתה זו עדיין.</div> : activeClass.materials.map(m => (
                            <button 
                              key={m.id} 
                              onClick={() => {
                                setActiveMaterial(m);
                                if (isTeacherRole && ['SUMMARY', 'UPLOADED_FILE', 'UPCOMING_TEST'].includes(m.type)) {
                                  setMaterialViewTab('VIEW');
                                } else {
                                  setMaterialViewTab('SUBMISSIONS');
                                }
                              }} 
                              className="w-full flex items-center justify-between p-6 bg-white rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-md transition-all text-right group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                        {m.type === 'TEST' ? <ListChecks size={22}/> : (m.type === 'ASSIGNMENT' ? <ClipboardList size={22}/> : <FileText size={22}/>)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-900 text-lg">{m.title}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{getHebrewType(m.type)} • {new Date(m.timestamp).toLocaleDateString('he-IL')}</p>
                                    </div>
                                </div>
                                <ChevronLeft size={20} className="text-gray-300 group-hover:text-primary transition-all" />
                            </button>
                        ))}
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 h-fit">
                        <h3 className="text-lg font-black mb-6 flex items-center gap-3"><Users size={20} className="text-blue-500"/> מידע כיתתי</h3>
                        <div className="space-y-4">
                              <div className="flex justify-between text-sm font-bold text-gray-500">מורה: <span className="text-gray-900">{activeClass.teacherName}</span></div>
                            <div className="flex justify-between text-sm font-bold text-gray-500">תלמידים: <span className="text-gray-900">{activeClass.studentsCount}</span></div>
                            <div className="pt-4 border-t"><span className="text-[10px] font-black text-gray-400 block mb-2 uppercase tracking-widest">קוד כיתה</span><div className="bg-gray-900 p-4 rounded-2xl flex justify-between items-center text-white font-mono font-black" dir="ltr"><span>{activeClass.id}</span><button onClick={() => { navigator.clipboard.writeText(activeClass.id); setCopiedCode(activeClass.id); setTimeout(() => setCopiedCode(null), 2000); }} className="p-2 hover:bg-white/10 rounded-lg">{copiedCode === activeClass.id ? <Check size={18} className="text-green-400"/> : <Copy size={18} className="text-gray-400"/>}</button></div></div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'CHAT' ? (
                <div className="max-w-4xl mx-auto flex flex-col h-[600px] bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600 shadow-sm"><MessageSquare size={24}/></div>
                            <div>
                                <h3 className="font-black text-gray-900">צ'אט כיתתי</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{visibleMessages.length} הודעות</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase">שלח אל:</label>
                            <select value={chatRecipient} onChange={e => setChatRecipient(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-primary">
                                <option value="ALL">כל הכיתה</option>
                                {!isTeacherOfThisClass && <option value={activeClass.teacherId}>המורה בלבד</option>}
                                {isTeacherOfThisClass && activeClass.studentIds?.map((id, idx) => <option key={id} value={id}>{activeClass.students?.[idx]}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/30 no-scrollbar">
                        {visibleMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                                <MessageSquare size={64} className="mb-4" />
                                <p className="font-black">טרם נשלחו הודעות בצ'אט זה</p>
                            </div>
                        ) : visibleMessages.map(msg => (
                            <div key={msg.id} className={`flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-1 px-2">
                                    <span className="text-[10px] font-black text-gray-400">{msg.senderName}</span>
                                    {msg.recipientId && <span className="bg-orange-100 text-orange-600 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">פרטי</span>}
                                </div>
                                <div className={`p-5 rounded-[1.75rem] max-w-[80%] shadow-sm ${msg.senderId === user.id ? 'bg-primary text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}`}>
                                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                                    {msg.attachment && <div className="mt-3 p-3 bg-black/5 rounded-xl border border-black/5 flex items-center gap-2"><Paperclip size={14}/><span className="text-[10px] font-bold truncate">קובץ מצורף</span></div>}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="p-6 bg-white border-t border-gray-100">
                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-[2rem] border border-gray-200">
                            <button onClick={() => chatFileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-primary transition-colors"><Paperclip size={24}/></button>
                            <input type="file" ref={chatFileInputRef} className="hidden" onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    const reader = new FileReader();
                                    reader.onloadend = () => setChatAttachment({ name: file.name, data: (reader.result as string).split(',')[1], mimeType: file.type });
                                    reader.readAsDataURL(file);
                                }
                            }} />
                            <input 
                              type="text" 
                              value={chatInput} 
                              onChange={e => setChatInput(e.target.value)} 
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSendMessage();
                                }
                              }} 
                              placeholder="כתוב הודעה..." 
                              className="flex-1 bg-transparent border-none outline-none font-bold text-sm px-4" 
                            />
                            <button onClick={handleSendMessage} disabled={!chatInput.trim() && !chatAttachment} className="bg-primary text-white p-4 rounded-full shadow-lg disabled:opacity-30 hover:bg-blue-600 transition-all"><Send size={20}/></button>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'ANALYTICS' && isTeacherOfThisClass && classStats ? (
                <div className="space-y-10 animate-fade-in">
                    <div className="flex items-center justify-between px-4">
                        <div>
                            <h3 className="text-3xl font-black text-gray-900">אנליטיקה ותובנות</h3>
                            <p className="text-gray-500 font-bold">מעקב ביצועים והישגים כיתתיים</p>
                        </div>
                        <button 
                            onClick={handleRefreshAIAnalytics} 
                            disabled={loadingAnalytics}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-primary text-white px-8 py-3 rounded-2xl font-black shadow-xl hover:shadow-indigo-200 transition-all disabled:opacity-30 transform hover:-translate-y-1"
                        >
                            {loadingAnalytics ? <Loader2 size={20} className="animate-spin"/> : <Sparkles size={20}/>}
                            <span>ניתוח פדגוגי עמוק (AI)</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:border-primary transition-all">
                            <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 mb-4 group-hover:bg-primary group-hover:text-white transition-all shadow-sm"><Trophy size={28}/></div>
                            <span className="text-4xl font-black text-gray-900 mb-1">{classStats.averageScore}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ממוצע כיתתי</span>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:border-emerald-500 transition-all">
                            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm"><ClipboardCheck size={28}/></div>
                            <span className="text-4xl font-black text-gray-900 mb-1">{classStats.submissionRate}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">אחוז הגשות</span>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:border-indigo-500 transition-all">
                            <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm"><Users size={28}/></div>
                            <span className="text-4xl font-black text-gray-900 mb-1">{classStats.studentsCount}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">תלמידים פעילים</span>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:border-orange-500 transition-all">
                            <div className="bg-orange-50 p-4 rounded-2xl text-orange-600 mb-4 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm"><BookOpen size={28}/></div>
                            <span className="text-4xl font-black text-gray-900 mb-1">{classStats.totalMaterials}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">חומרי למידה</span>
                        </div>
                    </div>

                    {loadingAnalytics ? (
                        <div className="bg-white p-20 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col items-center justify-center text-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-25"></div>
                                <div className="relative bg-indigo-50 p-6 rounded-full text-indigo-600"><BarChart3 size={48} className="animate-pulse"/></div>
                            </div>
                            <h4 className="text-xl font-black text-gray-800 mb-2">ה-AI מנתח את נתוני הכיתה...</h4>
                            <p className="text-gray-400 font-bold max-w-sm">מזהה פערים לימודיים ומפיק המלצות פדגוגיות מותאמות אישית.</p>
                        </div>
                    ) : classroomAIInsights ? (
                        <div className="grid lg:grid-cols-3 gap-6 animate-slide-up">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 border-r-[10px] border-r-orange-500">
                                <div className="bg-orange-50 p-3 rounded-2xl text-orange-600 w-fit mb-6"><Target size={24}/></div>
                                <h4 className="text-lg font-black text-gray-900 mb-2">מוקד הקושי המרכזי</h4>
                                <p className="text-gray-600 leading-relaxed font-medium">{classroomAIInsights.focus}</p>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 border-r-[10px] border-r-green-500">
                                <div className="bg-green-50 p-3 rounded-2xl text-green-600 w-fit mb-6"><TrendingUp size={24}/></div>
                                <h4 className="text-lg font-black text-gray-900 mb-2">נקודות חוזק כיתתיות</h4>
                                <p className="text-gray-600 leading-relaxed font-medium">{classroomAIInsights.strengths}</p>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 border-r-[10px] border-r-indigo-500">
                                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 w-fit mb-6"><Sparkles size={24}/></div>
                                <h4 className="text-lg font-black text-gray-900 mb-2">המלצות להמשך</h4>
                                <p className="text-gray-600 leading-relaxed font-medium">{classroomAIInsights.recommendations}</p>
                            </div>
                        </div>
                    ) : null}

                    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-10">
                            <h4 className="text-2xl font-black text-gray-900 flex items-center gap-3"><ClipboardList className="text-primary"/> פירוט משימות והישגים</h4>
            <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg text-xs font-black uppercase">{(activeClass.materials || []).length} מטלות סה"כ</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="pb-6 pr-6">שם המטלה</th>
                  <th className="pb-6">סוג</th>
                  <th className="pb-6 text-center">הגשות</th>
                  <th className="pb-6 text-center">ממוצע ציונים</th>
                  <th className="pb-6 text-center">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(activeClass.materials || []).map(m => {
                                        const submissionsCount = m.submissions?.length || 0;
                                        const scores = m.submissions?.filter(s => s.aiScore !== undefined).map(s => s.aiScore!) || [];
                                        const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
                                        
                                        return (
                                            <tr key={m.id} className="group hover:bg-gray-50/50 transition-all">
                                                <td className="py-6 pr-6 font-black text-gray-800">{m.title}</td>
                                                <td className="py-6"><span className="text-[10px] font-black bg-gray-100 px-3 py-1 rounded-full text-gray-500 uppercase">{getHebrewType(m.type)}</span></td>
                                                <td className="py-6 text-center font-bold text-gray-600">{submissionsCount} / {activeClass.studentsCount}</td>
                                                <td className="py-6 text-center">
                                                    <span className={`font-black text-xl ${avg === null ? 'text-gray-200' : (avg >= 85 ? 'text-green-600' : avg >= 60 ? 'text-orange-500' : 'text-red-500')}`}>
                                                        {avg !== null ? `${avg}` : '--'}
                                                    </span>
                                                </td>
                                                <td className="py-6 text-center">
                                                    {submissionsCount === activeClass.studentsCount ? (
                                                        <div className="flex items-center justify-center gap-1.5 text-green-500 text-[10px] font-black uppercase"><CheckCircle2 size={14}/> הושלם</div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1.5 text-gray-400 text-[10px] font-black uppercase"><Clock size={14}/> בתהליך</div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'STUDENTS' && isTeacherOfThisClass ? (
                <div className="space-y-8 animate-fade-in">
                    {viewingStudentId ? (
                        <div className="animate-slide-up">
                            {(() => {
                                const sIdx = activeClass.studentIds?.indexOf(viewingStudentId) ?? -1;
                                const sName = activeClass.students?.[sIdx] || 'תלמיד';
                                
                const tasks = (activeClass.materials || []).filter(m => m.type === 'TEST' || m.type === 'ASSIGNMENT');
                                const studentSubmissions = tasks.filter(m => m.submissions?.some(s => s.studentId === viewingStudentId));
                                const scores = studentSubmissions.map(m => m.submissions?.find(s => s.studentId === viewingStudentId)?.aiScore || 0);
                                const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a+b, 0) / scores.length) : null;
                                const rate = tasks.length > 0 ? Math.round((studentSubmissions.length / tasks.length) * 100) : 0;

                                return (
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between">
                                            <button onClick={() => setViewingStudentId(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-all group">
                                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                                                <span>חזרה לרשימת התלמידים</span>
                                            </button>
                                            <button 
                                                onClick={() => handleFetchStudentAI(sName, { averageScore: avg, submissionRate: rate, totalTasks: tasks.length, completedTasks: studentSubmissions.length })}
                                                disabled={loadingStudentAI}
                                                className="bg-indigo-600 text-white px-6 py-2 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                                            >
                                                {loadingStudentAI ? <Loader2 size={18} className="animate-spin"/> : <Bot size={18}/>}
                                                נתח תלמיד עם AI
                                            </button>
                                        </div>

                                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100">
                                            <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                                                <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-black shadow-inner uppercase">
                                                    {sName[0]}
                                                </div>
                                                <div className="text-center md:text-right">
                                                    <h3 className="text-3xl font-black text-gray-900">{sName}</h3>
                                                    <p className="text-gray-400 font-bold">תיק תלמיד אישי • {activeClass.name}</p>
                                                </div>
                                                <div className="flex-1 flex justify-center md:justify-end gap-6">
                                                    <div className="text-center">
                                                        <div className={`text-2xl font-black ${avg === null ? 'text-gray-300' : 'text-primary'}`}>{avg !== null ? `${avg}` : '--'}</div>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ממוצע ציונים</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-2xl font-black text-emerald-500">{rate}</div>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">אחוז הגשה</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {studentAIInsight && (
                                                <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 mb-12 animate-fade-in">
                                                    <h4 className="text-lg font-black text-indigo-900 mb-4 flex items-center gap-2"><Sparkles size={20}/> תובנות פדגוגיות (AI)</h4>
                                                    <p className="text-indigo-800 mb-6 font-medium leading-relaxed">{studentAIInsight.insight}</p>
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        {studentAIInsight.recommendations.map((rec, i) => (
                                                            <div key={i} className="bg-white p-4 rounded-2xl border border-indigo-100 text-xs font-bold text-indigo-600 flex items-start gap-3">
                                                                <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">{i+1}</div>
                                                                {rec}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <h4 className="text-xl font-black text-gray-900 mb-6">פירוט הגשות וציונים</h4>
                                            <div className="grid gap-3">
                                                {tasks.map(m => {
                                                    const sub = m.submissions?.find(s => s.studentId === viewingStudentId);
                                                    return (
                                                        <div key={m.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-2 bg-white rounded-xl shadow-sm">{getTypeIcon(m.type)}</div>
                                                                <div>
                                                                    <div className="font-black text-gray-800 text-sm">{m.title}</div>
                                                                    <div className="text-[10px] font-bold text-gray-400">{getHebrewType(m.type)}</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                {sub ? (
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="text-center">
                                                                            <div className="text-lg font-black text-primary">{sub.aiScore || 0}</div>
                                                                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">ציון AI</div>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => {
                                                                                setActiveMaterial(m);
                                                                                setMaterialViewTab('SUBMISSIONS');
                                                                                setViewingSubmissionId(sub.id);
                                                                                setActiveTab('MATERIALS');
                                                                            }}
                                                                            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all"
                                                                        >
                                                                            צפה בעבודה
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-gray-200 text-gray-500 px-3 py-1 rounded-lg text-[10px] font-black">לא הוגש</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        (!activeClass.studentIds || activeClass.studentIds.length === 0) ? (
                            <div className="bg-white p-16 rounded-[3rem] text-center border-2 border-dashed border-gray-200 animate-fade-in flex flex-col items-center">
                                <div className="bg-indigo-50 p-6 rounded-full text-indigo-500 mb-6">
                                    <Users size={48} />
                                </div>
                                <h4 className="text-2xl font-black text-gray-800 mb-2">אין לך עדיין תלמידים בכיתה</h4>
                                <p className="text-gray-400 mb-10 max-w-md mx-auto">כדי שתלמידים יוכלו לראות את חומרי הלימוד ולהגיש משימות, עליהם להצטרף לכיתה באמצעות הקוד הייחודי שלה.</p>
                                
                                <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 w-full max-w-sm">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">קוד הצטרפות לכיתה</span>
                                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm">
                                        <span className="text-3xl font-black text-primary tracking-widest select-all">{activeClass.id}</span>
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(activeClass.id);
                                                setCopiedCode(activeClass.id);
                                                setTimeout(() => setCopiedCode(null), 2000);
                                            }}
                                            className="p-3 bg-primary text-white rounded-xl shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2"
                                        >
                                            {copiedCode === activeClass.id ? <Check size={18} /> : <Copy size={18} />}
                                            <span className="text-xs font-black">{copiedCode === activeClass.id ? 'הועתק!' : 'העתק קוד'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activeClass.studentIds?.map((id, idx) => (
                                    <button 
                                        key={id} 
                                        onClick={() => setViewingStudentId(id)}
                                        className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group text-right flex items-center gap-5"
                                    >
                                        <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center font-black text-xl group-hover:bg-primary group-hover:text-white transition-all uppercase">
                                            {activeClass.students?.[idx]?.[0] || 'T'}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-gray-900 group-hover:text-primary transition-colors">{activeClass.students?.[idx] || 'תלמיד'}</h4>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 mt-0.5">
                                                <GraduationCap size={12}/>
                                                <span>צפייה בתיק תלמיד</span>
                                            </div>
                                        </div>
                                        <ChevronLeft size={16} className="text-gray-300 group-hover:text-primary transition-all"/>
                                    </button>
                                ))}
                            </div>
                        )
                    )}
                </div>
            ) : null}
        </div>
      ) : (
        <div className="animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
                <div className="max-w-2xl"><h2 className="text-4xl md:text-5xl font-black text-gray-900">{isTeacherRole ? 'הכיתות שלי' : 'הכיתות שאני לומד בהן'}</h2><p className="text-xl text-gray-500">{isTeacherRole ? 'נהלו את הלמידה המשותפת וצפו בחומרי הלימוד.' : 'כאן תוכל לצפות בחומרים שהמורה שלך העלה.'}</p></div>
                <div className="flex gap-4">
                    {isTeacherRole && <button onClick={() => setIsCreating(true)} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl flex items-center gap-2 hover:bg-black transition-all"><Plus size={18} /><span>יצירת כיתה</span></button>}
                    <button onClick={() => setIsJoining(true)} className="bg-white border-2 border-gray-100 text-gray-800 px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-50 transition-all"><Users size={18} /><span>הצטרפות לכיתה</span></button>
                </div>
            </div>
            
            {isCreating && isTeacherRole && (
                <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl mb-16 relative animate-slide-up">
                   <button onClick={() => setIsCreating(false)} className="absolute top-8 left-8 text-gray-400 hover:text-gray-900 transition-all"><X size={24}/></button>
                   <h3 className="text-3xl font-black mb-10">הקמת כיתה חדשה</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                       <div className="lg:col-span-2">
                         <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">שם הכיתה</label>
                         <div className="relative">
                           <input value={newClassName} onChange={e => setNewClassName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateClass()} placeholder="שם הכיתה..." className="w-full p-5 bg-gray-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-primary transition-all"/>
                           {isDetectingClassSubject && <div className="absolute left-5 top-1/2 -translate-y-1/2"><Loader2 size={18} className="animate-spin text-primary" /></div>}
                         </div>
                       </div>
                       <div>
                         <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">מקצוע</label>
                         <div className="space-y-3">
                           <select 
                             value={isManualClassSubject ? 'OTHER' : (newClassSubject as string)} 
                             onChange={e => {
                               const val = e.target.value;
                               if (val === 'OTHER') {
                                 setIsManualClassSubject(true);
                               } else {
                                 setIsManualClassSubject(false);
                                 setNewClassSubject(val);
                               }
                             }} 
                             className="w-full p-5 bg-gray-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-primary transition-all"
                           >
                             {Object.values(Subject).filter(s => s !== Subject.OTHER).map(s => <option key={s} value={s}>{s}</option>)}
                             <option value="OTHER">אחר...</option>
                           </select>
                           {isManualClassSubject && (
                             <input 
                               type="text"
                               value={customClassSubject}
                               onChange={e => setCustomClassSubject(e.target.value)}
                               placeholder="הזן שם מקצוע..."
                               className="w-full p-4 bg-white border-2 border-primary rounded-2xl font-bold text-xs outline-none animate-in slide-in-from-top-2 duration-200"
                               autoFocus
                             />
                           )}
                         </div>
                       </div>
                       <div><label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">כיתה</label><select value={newClassGrade} onChange={e => setNewClassGrade(e.target.value as Grade)} className="w-full p-5 bg-gray-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-primary transition-all">{Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                    </div>
                   <button onClick={handleCreateClass} className="w-full bg-primary text-white py-6 rounded-3xl font-black text-xl shadow-xl hover:bg-blue-600 transition-all">צור כיתה וקבל קוד מורה</button>
                </div>
            )}

            {isJoining && (
              <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl mb-16 relative animate-slide-up">
                 <button onClick={() => setIsJoining(false)} className="absolute top-8 left-8 text-gray-400 hover:text-gray-900 transition-all"><X size={24}/></button>
                 <h3 className="text-3xl font-black mb-4">הצטרפות לכיתה</h3>
                 <p className="text-gray-500 mb-10 font-medium">הזן את הקוד שקיבלת מהמורה שלך כדי להצטרף לכיתה ולקבל גישה לחומרים.</p>
                 <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <input 
                      value={joinCode} 
                      onChange={e => setJoinCode(e.target.value.toUpperCase())} 
                      onKeyDown={e => e.key === 'Enter' && handleJoinClass()}
                      placeholder="הזן קוד כיתה (למשל: X4F2G9)" 
                      className="flex-1 p-6 bg-gray-50 rounded-3xl font-black text-2xl outline-none border-2 border-transparent focus:border-primary transition-all text-center tracking-[0.5em]"
                    />
                    <button 
                      onClick={handleJoinClass}
                      disabled={!joinCode.trim()}
                      className="bg-primary text-white px-12 py-6 rounded-3xl font-black text-xl shadow-xl hover:bg-blue-600 disabled:opacity-30 transition-all"
                    >
                      הצטרף עכשיו
                    </button>
                 </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                {allGlobalClassrooms.filter(c => c.teacherId === user.id || c.studentIds?.includes(user.id)).map(c => (
                    <div key={c.id} onClick={() => { setActiveClassId(c.id); setActiveTab('MATERIALS'); }} className="group bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-500 text-right relative cursor-pointer">
                        <div className="bg-blue-50 p-5 rounded-[1.75rem] text-blue-600 shadow-xl mb-10 w-fit group-hover:bg-primary group-hover:text-white transition-all"><School size={32} /></div>
                        
                        <button 
                          onClick={(e) => c.teacherId === user.id ? handleDeleteClassroom(c.id, e) : handleLeaveClassroom(c.id, e)}
                          className="absolute top-8 left-8 p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                          title={c.teacherId === user.id ? "מחק כיתה" : "צא מהכיתה"}
                        >
                          <Trash2 size={20} />
                        </button>

                        <h3 className="text-2xl font-black mb-3 text-gray-900">{c.name}</h3>
                        <div className="text-sm font-bold text-gray-400 flex items-center gap-2"><span>{c.subject}</span><span>•</span><span>{c.grade}</span></div>
                        <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between text-xs font-black text-gray-300 group-hover:text-primary transition-all">
                            <span>צפייה בכיתה</span>
                            <ChevronLeft size={16}/>
                        </div>
                    </div>
                ))}
                {allGlobalClassrooms.filter(c => c.teacherId === user.id || c.studentIds?.includes(user.id)).length === 0 && (
                    <div className="col-span-full py-32 text-center flex flex-col items-center gap-4 opacity-30">
                        <School size={80}/>
                        <p className="text-2xl font-black">אין לך כיתות פעילות כרגע</p>
                    </div>
                )}
            </div>
        </div>
      )}

      </div>
      {workspaceOpen && activeClass && (
        <GlobalContentEditor
          user={user}
          onClose={handleCloseWorkspace}
          onPublish={handlePublish}
          classrooms={allGlobalClassrooms}
          initialMaterial={editingMaterial ? activeMaterial : null}
          initialSelectedClassIds={[activeClass.id]}
          onUpdateUser={onUpdateUser}
          isPro={isPro}
          checkAndIncrementAiLimit={checkAndIncrementAiLimit}
          title={editingMaterial ? 'עריכת חומר למידה' : 'מרחב הכנת תוכן לכיתה'}
        />
      )}
      </div>
    );
  };

export default ClassroomView;
