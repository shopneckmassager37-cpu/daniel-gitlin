
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { supabase } from './services/supabaseClient';
import Header from './components/Header.tsx';
import SubjectSelector from './components/SubjectSelector.tsx';
import PracticeArea from './components/PracticeArea.tsx';
import ChatBot from './components/ChatBot.tsx';
import ProgressChart from './components/ProgressChart.tsx';
import HistoryView from './components/HistoryView.tsx';
import MaterialRepositoryView from './components/MaterialRepositoryView.tsx';
import ResourcesView from './components/ResourcesView.tsx';
import TestPrepView from './components/TestPrepView.tsx';
import LoginLayout from './components/LoginLayout.tsx';
import ProfileModal from './components/ProfileModal.tsx';
import ClassroomView from './components/ClassroomView.tsx';
import TeacherDashboard from './components/TeacherDashboard.tsx';
import GlobalContentEditor from './components/GlobalContentEditor.tsx';
import AchievementView from './components/AchievementView.tsx';
import CalendarView from './components/CalendarView.tsx';
import CookieBanner from './components/CookieBanner.tsx';
import LibraryView from './components/LibraryView.tsx';
import CoursesView from './components/CoursesView.tsx';
import ParentVerificationModal from './components/ParentVerificationModal.tsx';
import SubscriptionView from './components/SubscriptionView.tsx';
import NotificationsView from './components/NotificationsView.tsx';
import Footer from './components/Footer.tsx';
import PrivacyView from './components/PrivacyView.tsx';
import TermsOfUseView from './components/TermsOfUseView.tsx';
import { dbService } from './services/dbService.ts';
import { safeSetItem, safeGetItem, safeRemoveItem } from './src/utils/storage';
import { 
  Subject, Grade, ViewMode, UserStats, HistoryItem, Question, 
  PracticeConfig, User, Classroom, MaterialType, ClassroomMaterial, 
  LessonPlan, ExamCheckResult, UserSettings, UserRole, ChatSession, Notification,
  TestPrepPlan
} from './types.ts';
import { analyzeAndRefreshLearningProfile, generateTestPrepPlan } from './services/geminiService.ts';
import LearningGamesView from './components/LearningGamesView.tsx';
import { PenTool, MessageCircle, BookOpen, GraduationCap, Calendar, Zap, Bot, ChevronLeft, ArrowRight, Bell, Sparkles, Clock, Trash2, Trophy, Presentation, Gamepad2 } from 'lucide-react';

const SUBJECT_SLUGS: Record<string, string> = {
  'מתמטיקה': 'math',
  'אנגלית': 'english',
  'מדעים': 'science',
  'היסטוריה': 'history',
  'גיאוגרפיה': 'geography',
  'תנ״ך': 'bible',
  'אזרחות': 'civics',
  'עברית (לשון)': 'language',
  'אחר': 'other'
};

const TAB_SLUGS: Record<string, string> = {
  'practice': 'practice',
  'test-prep': 'testprep',
  'resources': 'resources',
  'chat': 'chat',
  'games': 'games'
};

const REVERSE_SUBJECT_SLUGS = Object.fromEntries(Object.entries(SUBJECT_SLUGS).map(([k, v]) => [v, k]));
const REVERSE_TAB_SLUGS = Object.fromEntries(Object.entries(TAB_SLUGS).map(([k, v]) => [v, k]));

const RoleSelectionView: React.FC<{ onSelect: (role: UserRole) => void }> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-10 text-center space-y-8">
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-white mx-auto shadow-lg">
          <GraduationCap size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-gray-900">ברוכים הבאים ל-Lumdim!</h2>
          <p className="text-gray-500 font-medium">כדי להתאים לך את החוויה הטובה ביותר, ספר לנו מי אתה:</p>
        </div>
        <div className="grid gap-4">
          <button 
            onClick={() => onSelect('TEACHER')}
            className="group p-6 bg-white border-2 border-gray-100 rounded-2xl flex items-center gap-4 hover:border-primary hover:bg-blue-50 transition-all text-right"
          >
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Presentation size={24} />
            </div>
            <div>
              <h3 className="font-black text-gray-900">אני מורה</h3>
              <p className="text-xs text-gray-500">ניהול כיתות, יצירת חומרים ומעקב אחר תלמידים</p>
            </div>
          </button>
          <button 
            onClick={() => onSelect('STUDENT')}
            className="group p-6 bg-white border-2 border-gray-100 rounded-2xl flex items-center gap-4 hover:border-primary hover:bg-blue-50 transition-all text-right"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="font-black text-gray-900">אני תלמיד</h3>
              <p className="text-xs text-gray-500">תרגול שאלות, סיכומי שיעור ועזרה בלמידה</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const NameSelectionView: React.FC<{ onSelect: (name: string) => void, orgName?: string | null }> = ({ onSelect, orgName }) => {
  const [name, setName] = useState('');
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-10 text-center space-y-8">
        <div className="w-20 h-20 bg-blue-50 text-primary rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <Sparkles size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-gray-900">
            {orgName ? `ברוכים הבאים ל-${orgName}!` : 'ברוכים הבאים ל-Lumdim!'}
          </h2>
          <p className="text-gray-500 font-medium">איך תרצה שנקרא לך?</p>
        </div>
        <div className="space-y-4">
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSelect(name.trim())}
            placeholder="הכנס את שמך..."
            className="w-full py-4 px-6 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-right outline-none focus:border-primary transition-all"
            autoFocus
          />
          <button 
            onClick={() => name.trim() && onSelect(name.trim())}
            disabled={!name.trim()}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            בואו נתחיל
          </button>
        </div>
      </div>
    </div>
  );
};

const MainContent: React.FC = () => {
  const { login, register, logout, user: kindeUser, isAuthenticated, isLoading } = useKindeAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { classCode } = useParams();
  const [extraDataVersion, setExtraDataVersion] = useState(0);
  const [schoolUser, setSchoolUser] = useState<User | null>(() => {
    const saved = safeGetItem('school_user_auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSelectingRole, setIsSelectingRole] = useState(false);
  const [isSelectingName, setIsSelectingName] = useState(false);
  const [isParentVerificationNeeded, setIsParentVerificationNeeded] = useState(false);
  const [welcomeOrgName, setWelcomeOrgName] = useState<string | null>(null);

  // Derive internal user directly from Kinde user or school user
  const user = useMemo(() => {
    if (schoolUser) return schoolUser;
    if (!isAuthenticated || !kindeUser) return null;
    
    const userId = kindeUser.id;
    const saved = safeGetItem(`user_extra_${userId}`);
    const extra = saved ? JSON.parse(saved) : {};

    // Helper to check if a photo URL is likely a placeholder or invalid
    const isPlaceholderPhoto = (url?: string | null) => {
      if (!url) return true;
      if (url.startsWith('data:image')) return false; // User uploaded base64
      const placeholders = [
        'kinde-oss',
        'default-user',
        'placeholder',
        'avatar',
        'gravatar.com/avatar/00000000000000000000000000000000'
      ];
      return placeholders.some(p => url.toLowerCase().includes(p));
    };

    const photoUrl = isPlaceholderPhoto(extra.photoUrl || kindeUser.picture) 
      ? null 
      : (extra.photoUrl || kindeUser.picture);

    // Check for pending role from login screen
    const pendingRole = safeGetItem('pending_role') as UserRole | null;
    if (pendingRole && !extra.role) {
      extra.role = pendingRole;
      extra.subscriptionType = 'Free';
      safeSetItem(`user_extra_${userId}`, JSON.stringify(extra));
      safeRemoveItem('pending_role');
    }

    return {
      id: userId,
      name: extra.name || (kindeUser.givenName ? `${kindeUser.givenName} ${kindeUser.familyName || ''}` : null),
      email: kindeUser.email || undefined,
      role: extra.role || 'STUDENT',
      photoUrl: photoUrl,
      streak: extra.streak || 0,
      totalQuestionsSolved: extra.totalQuestionsSolved || 0,
      provider: 'supabase',
      subscriptionType: extra.subscriptionType || 'Free',
      aiRequestsToday: extra.aiRequestsToday || 0,
      lastAiRequestDate: extra.lastAiRequestDate || new Date().toISOString().split('T')[0],
      practiceRequestsToday: extra.practiceRequestsToday || 0,
      summaryRequestsToday: extra.summaryRequestsToday || 0,
      chatRequestsToday: extra.chatRequestsToday || 0,
      testPrepRequestsThisWeek: extra.testPrepRequestsThisWeek || 0,
      lastTestPrepWeek: extra.lastTestPrepWeek,
      settings: extra.settings || { darkMode: false, showProgressStats: true, notificationsEnabled: true, autoSaveDrafts: true },
      schoolCode: extra.schoolCode,
      schoolName: extra.schoolName,
      grade: extra.grade
    } as User;
  }, [kindeUser, isAuthenticated, extraDataVersion, schoolUser]);

  useEffect(() => {
    if (isAuthenticated && kindeUser && !schoolUser) {
      const userId = kindeUser.id;
      const saved = safeGetItem(`user_extra_${userId}`);
      const extra = saved ? JSON.parse(saved) : {};
      
      // Handle pending org code
      const pendingOrgCode = safeGetItem('pending_org_code');
      const pendingOrgName = safeGetItem('pending_org_name');
      
      let currentSchoolCode = extra.schoolCode;

      if (pendingOrgCode && extra.schoolCode !== pendingOrgCode) {
        const schoolData = { 
          schoolCode: pendingOrgCode, 
          schoolName: pendingOrgName,
          subscriptionType: 'Pro' as const
        };
        
        // Use updateUserData to ensure sync to server DB
        updateUserData(schoolData);
        
        safeRemoveItem('pending_org_code');
        safeRemoveItem('pending_org_name');
        setWelcomeOrgName(pendingOrgName);
        currentSchoolCode = pendingOrgCode;

        // Ensure Kinde association happens on server
        fetch('/api/auth/validate-school', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: pendingOrgCode, userId: userId })
        }).catch(err => console.error("Failed to sync Kinde association:", err));
      }

      if (!extra.role) {
        setIsSelectingRole(true);
      } else {
        setIsSelectingRole(false);
      }

      // Check if name is missing (explicitly null or empty)
      if (!extra.name && !kindeUser.givenName) {
        setIsSelectingName(true);
      } else {
        setIsSelectingName(false);
      }

      // Check for parent verification
      const pendingOver13 = safeGetItem('pending_over_13');
      if ((pendingOver13 === 'false' || extra.isOver13 === false) && !extra.isParentVerified && user?.role !== 'TEACHER') {
        setIsParentVerificationNeeded(true);
      } else {
        setIsParentVerificationNeeded(false);
      }
    } else {
      setIsSelectingRole(false);
      setIsSelectingName(false);
    }
  }, [isAuthenticated, kindeUser, schoolUser]);

  const isPro = user?.subscriptionType === 'Pro' || !!user?.schoolCode;
  const showProBranding = isPro && !user?.schoolCode;

  const checkAndIncrementAiLimit = (type: 'PRACTICE' | 'SUMMARY' | 'CHAT' | 'TEST_PREP'): boolean => {
    if (!user) return true;
    if (user.subscriptionType === 'Pro') return true;

    const today = new Date().toISOString().split('T')[0];
    const currentWeek = getYearWeek(new Date());

    if (user.role === 'TEACHER') {
      let currentRequests = user.aiRequestsToday || 0;
      if (user.lastAiRequestDate !== today) currentRequests = 0;
      if (currentRequests >= 10) return false;
      updateUserData({ aiRequestsToday: currentRequests + 1, lastAiRequestDate: today });
      return true;
    } else {
      // Student limits
      if (type === 'PRACTICE') {
        let count = user.practiceRequestsToday || 0;
        if (user.lastAiRequestDate !== today) count = 0;
        if (count >= 5) return false;
        updateUserData({ practiceRequestsToday: count + 1, lastAiRequestDate: today });
      } else if (type === 'SUMMARY') {
        let count = user.summaryRequestsToday || 0;
        if (user.lastAiRequestDate !== today) count = 0;
        if (count >= 1) return false;
        updateUserData({ summaryRequestsToday: count + 1, lastAiRequestDate: today });
      } else if (type === 'CHAT') {
        let count = user.chatRequestsToday || 0;
        if (user.lastAiRequestDate !== today) count = 0;
        if (count >= 15) return false;
        updateUserData({ chatRequestsToday: count + 1, lastAiRequestDate: today });
      } else if (type === 'TEST_PREP') {
        let count = user.testPrepRequestsThisWeek || 0;
        if (user.lastTestPrepWeek !== currentWeek) count = 0;
        if (count >= 1) return false;
        updateUserData({ testPrepRequestsThisWeek: count + 1, lastTestPrepWeek: currentWeek });
      }
      return true;
    }
  };

  const getYearWeek = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  };

  // Helper to update extra user data
  const updateUserData = (newData: Partial<User>) => {
    if (schoolUser) {
      const updated = { ...schoolUser, ...newData };
      setSchoolUser(updated);
      safeSetItem('school_user_auth', JSON.stringify(updated));
      return;
    }
    if (!kindeUser) return;
    const userId = kindeUser.id;
    const saved = safeGetItem(`user_extra_${userId}`);
    const currentExtra = saved ? JSON.parse(saved) : {};
    const updatedExtra = { ...currentExtra, ...newData };
    safeSetItem(`user_extra_${userId}`, JSON.stringify(updatedExtra));
    setExtraDataVersion(v => v + 1);

    // Sync to Supabase
    const userToSave = {
      id: userId,
      email: kindeUser.email || undefined,
      name: updatedExtra.name || (kindeUser.givenName ? `${kindeUser.givenName} ${kindeUser.familyName || ''}` : null),
      role: updatedExtra.role || 'STUDENT',
      ...updatedExtra
    } as User;
    
    dbService.saveUser(userToSave).catch(err => console.error("Failed to sync user data to Supabase:", err));
  };

  const [activeTab, setActiveTab] = useState<'practice' | 'chat' | 'resources' | 'test-prep' | 'games'>('practice');
  const [chatContext, setChatContext] = useState<string | null>(null);
  const [practiceConfig, setPracticeConfig] = useState<PracticeConfig | null>(null);
  const [testPrepInitialData, setTestPrepInitialData] = useState<{subject: Subject, grade: Grade, topic: string, days: number, attachment?: any} | null>(null);
  const [summaryToOpen, setSummaryToOpen] = useState<{title: string, content: string} | null>(null);

  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [initialMaterialId, setInitialMaterialId] = useState<string | null>(null);
  const [initialStudentId, setInitialStudentId] = useState<string | null>(null);
  const [initialClassroomTab, setInitialClassroomTab] = useState<'MATERIALS' | 'CHAT' | 'STUDENTS' | 'ANALYTICS' | null>(null);
  const [initialClassroomCreateMode, setInitialClassroomCreateMode] = useState(false);
  const [initialTeacherTab, setInitialTeacherTab] = useState<'OVERVIEW' | 'PLANNER' | 'CHAT' | 'EXAM_CHECKER' | undefined>(undefined);
  const [initialLessonPlan, setInitialLessonPlan] = useState<LessonPlan | null>(null);
  const [initialHistoryId, setInitialHistoryId] = useState<string | null>(null);
  const [initialExamResult, setInitialExamResult] = useState<ExamCheckResult | null>(null);
  const [initialGrade, setInitialGrade] = useState<Grade | null>(null);
  const [initialTopic, setInitialTopic] = useState<string | null>(null);
  const [isGlobalEditorOpen, setIsGlobalEditorOpen] = useState(false);
  const [initialGlobalEditorData, setInitialGlobalEditorData] = useState<ClassroomMaterial | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<UserStats[]>([]);
  const DB_KEY = useMemo(() => user?.id ? `lumdim_global_database_${user.id}` : 'lumdim_global_database_v1', [user?.id]);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const prevClassroomsRef = useRef<Classroom[]>([]);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(() => {
    const saved = safeGetItem('user_auth');
    if (!saved) return null;
    try {
      const u = JSON.parse(saved);
      // Check user object first, then local storage
      return u.grade || safeGetItem(`user_grade_${u.id}`) as Grade || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user?.grade && !selectedGrade) {
      setSelectedGrade(user.grade);
    }
  }, [user?.grade, selectedGrade]);
  
  const [userSubjects, setUserSubjects] = useState<(Subject | string)[]>(Object.values(Subject).filter(s => s !== Subject.OTHER));
  const [userName, setUserName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('DASHBOARD');
  const [previousViewMode, setPreviousViewMode] = useState<ViewMode>('DASHBOARD');
  const prevViewModeRef = useRef<ViewMode>(viewMode);

  useEffect(() => {
    if (prevViewModeRef.current !== viewMode) {
      setPreviousViewMode(prevViewModeRef.current);
      prevViewModeRef.current = viewMode;
    }
  }, [viewMode]);

  const loadClassrooms = async () => {
    if (!user?.id) return;
    try {
      const data = await dbService.getClassrooms(user.id);
      setAllClassrooms(data);
    } catch (e) {
      console.error("Failed to load classrooms from Supabase", e);
      const data = safeGetItem(DB_KEY);
      if (data) {
        setAllClassrooms(JSON.parse(data));
      }
    }
  };

  const syncClassrooms = async (classrooms: Classroom[]) => {
    try {
      await dbService.syncClassrooms(classrooms);
    } catch (e) {
      console.error("Failed to sync classrooms to Supabase", e);
    }
  };

  const syncUsers = async (users: User[]) => {
    try {
      for (const u of users) {
        await dbService.saveUser(u);
      }
    } catch (e) {
      console.error("Failed to sync users to Supabase", e);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadClassrooms();
    }
    const sync = () => loadClassrooms();
    window.addEventListener('storage', sync);
    window.addEventListener('lumdim-db-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('lumdim-db-updated', sync);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || allClassrooms.length === 0) {
      prevClassroomsRef.current = allClassrooms;
      return;
    }
    if (prevClassroomsRef.current.length === 0) {
      prevClassroomsRef.current = allClassrooms;
      return;
    }
    const newNotifications: any[] = [];
    allClassrooms.forEach(currClass => {
      const prevClass = prevClassroomsRef.current.find(c => c.id === currClass.id);
      if (!prevClass) return;

      // New messages
      if ((currClass.messages?.length || 0) > (prevClass.messages?.length || 0)) {
        const lastMsg = currClass.messages![currClass.messages!.length - 1];
        if (lastMsg.senderId !== user.id) {
          newNotifications.push({ 
            id: `msg-${Date.now()}-${Math.random()}`, 
            userId: user.id,
            title: 'הודעה חדשה בכיתה', 
            message: `התקבלה הודעה מ${lastMsg.senderName} בכיתה "${currClass.name}"`, 
            text: `התקבלה הודעה מ${lastMsg.senderName} בכיתה "${currClass.name}"`, 
            type: 'CHAT', 
            classId: currClass.id,
            timestamp: Date.now(), 
            isRead: false,
            read: false 
          });
        }
      }

      // New submissions (Teacher only)
      if (user.role === 'TEACHER' && currClass.teacherId === user.id) {
        currClass.materials.forEach(currMat => {
          const prevMat = prevClass.materials.find(m => m.id === currMat.id);
          if (prevMat && (currMat.submissions?.length || 0) > (prevMat.submissions?.length || 0)) {
            const lastSub = currMat.submissions![currMat.submissions!.length - 1];
            newNotifications.push({ 
              id: `sub-${Date.now()}-${Math.random()}`, 
              userId: user.id,
              title: 'הגשה חדשה התקבלה', 
              message: `התקבלה הגשה מ${lastSub.studentName} עבור המשימה "${currMat.title}" בכיתה "${currClass.name}"`, 
              text: `התקבלה הגשה מ${lastSub.studentName} עבור המשימה "${currMat.title}" בכיתה "${currClass.name}"`, 
              type: 'SUBMISSION', 
              classId: currClass.id,
              materialId: currMat.id,
              studentId: lastSub.studentId,
              timestamp: Date.now(), 
              isRead: false,
              read: false 
            });
          }
        });
      }
    });

    if (newNotifications.length > 0) {
      const updatedNotifications = [...newNotifications, ...notifications];
      setNotifications(updatedNotifications);
      safeSetItem(`user_notifications_${user.id}`, JSON.stringify(updatedNotifications));
      
      // Sync new notifications to Supabase
      newNotifications.forEach(n => {
        dbService.saveNotification(n as any).catch(err => console.error("Failed to save notification to Supabase:", err));
      });
    }
    prevClassroomsRef.current = allClassrooms;
  }, [allClassrooms, user?.id, user?.role]);

  useEffect(() => {
    if (user?.settings?.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [user?.settings?.darkMode]);

  useEffect(() => {
    if (user) {
      // Load from Supabase
      const loadInitialData = async () => {
        const [remoteHistory, remoteStats, remoteNotifications] = await Promise.all([
          dbService.getHistory(user.id),
          dbService.getStats(user.id),
          dbService.getNotifications(user.id)
        ]);

        if (remoteHistory.length > 0) {
          setHistory(remoteHistory);
          safeSetItem(`study_history_${user.id}`, JSON.stringify(remoteHistory));
        } else {
          const savedHistory = safeGetItem(`study_history_${user.id}`);
          setHistory(savedHistory ? JSON.parse(savedHistory) : []);
        }

        if (remoteStats.length > 0) {
          setStats(remoteStats);
          safeSetItem(`user_stats_${user.id}`, JSON.stringify(remoteStats));
        } else {
          const savedStats = safeGetItem(`user_stats_${user.id}`);
          setStats(savedStats ? JSON.parse(savedStats) : Object.values(Subject).map(s => ({ subject: s, correct: 0, total: 0 })));
        }

        if (remoteNotifications.length > 0) {
          setNotifications(remoteNotifications as any);
          safeSetItem(`user_notifications_${user.id}`, JSON.stringify(remoteNotifications));
        } else {
          const savedNotifications = safeGetItem(`user_notifications_${user.id}`);
          setNotifications(savedNotifications ? JSON.parse(savedNotifications) : []);
        }
      };

      loadInitialData();

      const savedGrade = safeGetItem(`user_grade_${user.id}`);
      setSelectedGrade(savedGrade as Grade || null);
      const savedSubjects = safeGetItem(`user_subjects_${user.id}`);
      if (savedSubjects) setUserSubjects(JSON.parse(savedSubjects));
      else setUserSubjects(Object.values(Subject));
      setUserName(user.name);
      updateStreak(user);
    } else {
      setHistory([]);
      setStats([]);
      setSelectedGrade(null);
      setUserSubjects(Object.values(Subject));
    }
  }, [user?.id]);

  const updateStreak = (currentUser: User) => {
    if (currentUser.role === 'TEACHER') return;
    const lastDate = currentUser.lastActivityDate;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();
    let newStreak = currentUser.streak || 0;
    if (!lastDate) newStreak = 1;
    else {
      const last = new Date(lastDate);
      last.setHours(0, 0, 0, 0);
      const lastTime = last.getTime();
      const diffDays = (today - lastTime) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) newStreak += 1;
      else if (diffDays > 1) newStreak = 1;
    }
    if (newStreak !== currentUser.streak || today !== currentUser.lastActivityDate) {
      const updatedUser = { ...currentUser, streak: newStreak, lastActivityDate: today };
      updateUserData(updatedUser);
      safeSetItem('user_auth', JSON.stringify(updatedUser));
      
      dbService.saveUser(updatedUser).catch(err => console.error("Failed to sync user streak to Supabase:", err));
    }
  };

  useEffect(() => {
    if (!user) return;
    safeSetItem('user_auth', JSON.stringify(user));
    if (selectedGrade) safeSetItem(`user_grade_${user.id}`, selectedGrade);
    safeSetItem(`study_history_${user.id}`, JSON.stringify(history));
    safeSetItem(`user_stats_${user.id}`, JSON.stringify(stats));
    safeSetItem(`user_subjects_${user.id}`, JSON.stringify(userSubjects));
    
    // Periodically sync user data to Supabase
    const timeout = setTimeout(async () => {
      try {
        await Promise.all([
          dbService.saveUser(user),
          dbService.saveStats(user.id, stats)
        ]);
      } catch (e) {
        console.error("Failed to sync user data to Supabase", e);
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [selectedGrade, history, stats, user, userSubjects]);

  useEffect(() => {
    if (!user || user.role === 'TEACHER' || history.length === 0) return;
    
    const lastAnalyzed = user.learningProfile?.lastAnalyzedTimestamp || 0;
    const newItems = history.filter(h => h.timestamp > lastAnalyzed);
    
    // Hidden learning function: analyze after every few new activities
    if (newItems.length >= 3) {
      const updateProfile = async () => {
        try {
          const newProfile = await analyzeAndRefreshLearningProfile(history, user.learningProfile);
          updateUserData({ learningProfile: newProfile });
        } catch (e) {
          console.error("Failed to update learning profile", e);
        }
      };
      updateProfile();
    }
  }, [history.length, user?.id]);

  const handleResetSystem = async () => {
    if (user?.id) {
      try {
        await dbService.deleteUser(user.id);
      } catch (e) {
        console.error("Failed to delete user from Supabase", e);
      }
    }
    localStorage.clear();
    window.location.reload();
  };
  const handleLogout = async () => { 
    if (schoolUser) {
      setSchoolUser(null);
      safeRemoveItem('school_user_auth');
    } else {
      try {
        await logout();
      } catch (e) {
        console.error("Sign out failed", e);
      }
    }
    setViewMode('DASHBOARD'); 
    document.documentElement.classList.remove('dark');
    navigate('/');
    window.location.reload();
  };
  const handleUpdateProfile = (name: string, photoUrl: string, settings: UserSettings, grade?: Grade) => {
    const update: Partial<User> = { name, photoUrl, settings };
    if (user?.role !== 'TEACHER' && grade) {
      update.grade = grade;
      setSelectedGrade(grade);
      safeSetItem(`user_grade_${user?.id}`, grade);
    }
    updateUserData(update);
  };

  const isTeacher = user?.role === 'TEACHER';

  // Handle dynamic page titles
  useEffect(() => {
    let title = 'Lumdim';
    const path = location.pathname;

    if (path === '/') {
      title = 'Lumdim - לומדים חכם יותר';
    } else if (path === '/courses') {
      title = 'קורסים | Lumdim';
    } else if (path === '/subscription') {
      title = 'מנוי | Lumdim';
    } else if (path === '/library') {
      title = 'ספרייה | Lumdim';
    } else if (path === '/history') {
      title = isTeacher ? 'מאגר חומרים | Lumdim' : 'היסטוריה | Lumdim';
    } else if (path === '/achievements') {
      title = 'הישגים | Lumdim';
    } else if (path === '/calendar') {
      title = 'יומן | Lumdim';
    } else if (path === '/notifications') {
      title = 'התראות | Lumdim';
    } else if (path.startsWith('/class')) {
      if (classCode) {
        const classroom = allClassrooms.find(c => c.code === classCode || c.id === classCode);
        title = `כיתות | ${classroom?.name || classCode} | Lumdim`;
      } else {
        title = 'כיתות | Lumdim';
      }
    } else if (path.startsWith('/practice')) {
      title = 'תרגול | Lumdim';
    } else if (path === '/chat') {
      title = "צ'אט | Lumdim";
    } else if (path === '/games') {
      title = 'משחקים | Lumdim';
    }

    document.title = title;
  }, [location.pathname, isTeacher, classCode, allClassrooms]);

  // Sync viewMode with URL
  useEffect(() => {
    const path = location.pathname;

    if (path === '/') setViewMode('DASHBOARD');
    else if (path === '/courses') setViewMode('COURSES');
    else if (path === '/subscription') setViewMode('SUBSCRIPTION');
    else if (path === '/library') setViewMode('LIBRARY');
    else if (path === '/history') setViewMode('HISTORY');
    else if (path === '/achievements') setViewMode('ACHIEVEMENTS');
    else if (path === '/calendar') setViewMode('CALENDAR');
    else if (path === '/notifications') setViewMode('NOTIFICATIONS');
    else if (path.startsWith('/class')) {
      setViewMode('CLASSROOM');
      if (classCode) {
        const classroom = allClassrooms.find(c => c.code === classCode || c.id === classCode);
        if (classroom) setActiveClassId(classroom.id);
      }
    }
    else if (path.startsWith('/practice') || Object.values(SUBJECT_SLUGS).some(s => path.startsWith(`/${s}/`))) {
      setViewMode('PRACTICE');
      
      // Extract subject and column from URL if present
      const parts = path.split('/');
      const urlSubjectSlug = parts[1] === 'practice' ? parts[2] : parts[1];
      const urlColumnSlug = parts[1] === 'practice' ? parts[3] : parts[2];

      const realSubject = REVERSE_SUBJECT_SLUGS[urlSubjectSlug] || decodeURIComponent(urlSubjectSlug);
      const realTab = REVERSE_TAB_SLUGS[urlColumnSlug] || urlColumnSlug;
      
      if (realSubject) setSelectedSubject(realSubject);
      if (realTab) {
        if (realTab === 'practice') setActiveTab('practice');
        else if (realTab === 'test-prep') setActiveTab('test-prep');
        else if (realTab === 'resources') setActiveTab('resources');
        else if (realTab === 'chat') setActiveTab('chat');
        else if (realTab === 'games') setActiveTab('games');
      } else {
        setActiveTab('practice');
      }
    }
    else if (path === '/chat') {
      setViewMode('CHAT');
      setActiveTab('chat');
    }
    else if (path === '/games') {
      setViewMode('GAMES');
      setActiveTab('games');
    }
    else if (path === '/courses') setViewMode('COURSES');
    else if (path === '/resources') {
      setViewMode('PRACTICE');
      setActiveTab('resources');
    }
    else if (path === '/test-prep') {
      setViewMode('PRACTICE');
      setActiveTab('test-prep');
    }
  }, [location.pathname, classCode, allClassrooms]);

  const handleGradeSelect = (grade: Grade) => {
    setSelectedGrade(grade);
    updateUserData({ grade });
  };
  const handleChangeGrade = () => { 
    setSelectedGrade(null); 
    setSelectedSubject(null); 
    navigate('/');
    updateUserData({ grade: undefined });
  };
  const handleSubjectSelect = (subject: Subject | string) => { 
    setSelectedSubject(subject); 
    const subjectSlug = SUBJECT_SLUGS[subject] || encodeURIComponent(subject);
    navigate(`/${subjectSlug}/practice`); 
    setActiveTab('practice'); 
    setPracticeConfig(null); 
  };
  const handleAddSubject = (subjectName: string) => { if (!subjectName.trim() || userSubjects.includes(subjectName)) return; setUserSubjects([...userSubjects, subjectName]); };

  const handleHomeClick = () => { navigate('/'); setActiveTab('practice'); setSelectedSubject(null); setPracticeConfig(null); setSummaryToOpen(null); setActiveClassId(null); setInitialMaterialId(null); setInitialStudentId(null); setInitialTeacherTab(undefined); setInitialLessonPlan(null); setInitialHistoryId(null); setInitialGlobalEditorData(null); setInitialClassroomCreateMode(false); };
  const handleHistoryClick = () => { navigate('/history'); };
  const handleClassroomClick = () => { navigate('/class'); setInitialClassroomCreateMode(false); };
  const handleLibraryClick = () => { if (isTeacher) navigate('/library'); };
  const handleGamesClick = () => { navigate('/games'); };
  const handleCoursesClick = () => { navigate('/courses'); };
  const handleUpgradeClick = () => { 
    if (user?.schoolCode) return;
    navigate('/subscription');
  };
  const handleAchievementsClick = () => { navigate('/achievements'); };
  const handleCalendarClick = () => { navigate('/calendar'); };
  const handleNotificationsClick = () => { 
    navigate('/notifications');
    setNotifications(prev => prev.map(n => ({...n, read: true, isRead: true}))); 
    if (user) {
      dbService.markAllNotificationsRead(user.id).catch(err => console.error("Failed to mark all notifications as read:", err));
    }
  };

  const handleBackFromGenericView = () => setViewMode(previousViewMode);
  const isHeaderHidden = viewMode !== 'DASHBOARD' && viewMode !== 'GAMES';
  const handleAddHistoryItem = (item: HistoryItem) => {
    setHistory(prev => [item, ...prev]);
    if (user?.id) {
      dbService.saveHistoryItem(user.id, item).catch(err => console.error("Failed to save history item to Supabase:", err));
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    dbService.deleteHistoryItem(id).catch(err => console.error("Failed to delete history item from Supabase:", err));
  };

  const handleDeleteAllHistory = () => {
    setHistory([]);
    if (user?.id) {
      dbService.deleteAllHistory(user.id).catch(err => console.error("Failed to delete all history from Supabase:", err));
    }
  };

  const handleSaveChatSession = (session: ChatSession) => {
    if (!user) return;
    const currentHistory = user.chatHistory || [];
    const exists = currentHistory.findIndex(s => s.id === session.id);
    let newHistory;
    if (exists !== -1) {
      newHistory = [...currentHistory];
      newHistory[exists] = session;
    } else {
      newHistory = [session, ...currentHistory];
    }
    updateUserData({ chatHistory: newHistory });
  };

  const handleDeleteChatSession = (id: string) => {
    if (!user) return;
    const newHistory = (user.chatHistory || []).filter(s => s.id !== id);
    updateUserData({ chatHistory: newHistory });
  };

  const handleQuestionAnswered = (question: Question, isCorrect: boolean) => {
    if (!selectedSubject || !selectedGrade || !user) return;
    setStats(prev => {
        const exists = prev.find(s => s.subject === selectedSubject);
        if (exists) return prev.map(s => s.subject === selectedSubject ? { ...s, correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 } : s);
        return [...prev, { subject: selectedSubject as Subject, correct: isCorrect ? 1 : 0, total: 1 }];
    });
    updateUserData({ totalQuestionsSolved: (user.totalQuestionsSolved || 0) + 1 });
    handleAddHistoryItem({ id: Date.now().toString(), timestamp: Date.now(), subject: selectedSubject as Subject, grade: selectedGrade, type: 'PRACTICE', title: question.text, isCorrect: isCorrect });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600 font-bold">מכין את מרחב הלמידה...</p>
      </div>
    );
  }

  if (isSelectingRole) {
    return <RoleSelectionView onSelect={(role) => {
      const subscriptionType = user?.subscriptionType === 'Pro' ? 'Pro' : (role === 'TEACHER' ? 'Free' : 'Pro');
      updateUserData({ role, subscriptionType });
    }} />;
  }

  if (isSelectingName) {
    return (
      <NameSelectionView 
        orgName={welcomeOrgName || user?.schoolName} 
        onSelect={(name) => {
          updateUserData({ name });
          setIsSelectingName(false);
        }} 
      />
    );
  }

  const [isMaterialFullscreen, setIsMaterialFullscreen] = useState(false);

  return (
    <div dir="rtl">
      {(!isAuthenticated && !schoolUser) ? (
        <LoginLayout 
          onLogin={(u) => {
            // Guest login
            setSchoolUser(u);
            safeSetItem('school_user_auth', JSON.stringify(u));
          }} 
          onSchoolLogin={() => {}}
          onShowPrivacy={() => navigate('/policies/privacy')}
          onShowTerms={() => navigate('/policies/terms')}
        />
      ) : (
        user && (
          <AppContent 
            user={user}
            updateUserData={updateUserData}
            isTeacher={isTeacher}
            isPro={isPro}
            checkAndIncrementAiLimit={checkAndIncrementAiLimit}
            allClassrooms={allClassrooms}
            setAllClassrooms={setAllClassrooms}
            history={history}
            setHistory={setHistory}
            stats={stats}
            setStats={setStats}
            notifications={notifications}
            setNotifications={setNotifications}
            selectedGrade={selectedGrade}
            setSelectedGrade={setSelectedGrade}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            userSubjects={userSubjects}
            setUserSubjects={setUserSubjects}
            userName={user.name}
            setUserName={() => {}} // Not used anymore
            viewMode={viewMode}
            setViewMode={setViewMode}
            previousViewMode={previousViewMode}
            setPreviousViewMode={setPreviousViewMode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            practiceConfig={practiceConfig}
            setPracticeConfig={setPracticeConfig}
            isGlobalEditorOpen={isGlobalEditorOpen}
            setIsGlobalEditorOpen={setIsGlobalEditorOpen}
            isMaterialFullscreen={isMaterialFullscreen}
            setIsMaterialFullscreen={setIsMaterialFullscreen}
            initialGlobalEditorData={initialGlobalEditorData}
            setInitialGlobalEditorData={setInitialGlobalEditorData}
            isProfileModalOpen={isProfileModalOpen}
            setIsProfileModalOpen={setIsProfileModalOpen}
            activeClassId={activeClassId}
            setActiveClassId={setActiveClassId}
            initialMaterialId={initialMaterialId}
            setInitialMaterialId={setInitialMaterialId}
            initialStudentId={initialStudentId}
            setInitialStudentId={setInitialStudentId}
            handleHomeClick={handleHomeClick}
            handleHistoryClick={handleHistoryClick}
            handleClassroomClick={handleClassroomClick}
            handleLibraryClick={handleLibraryClick}
            handleCoursesClick={handleCoursesClick}
            handleUpgradeClick={handleUpgradeClick}
            handleAchievementsClick={handleAchievementsClick}
            handleCalendarClick={handleCalendarClick}
            handleNotificationsClick={handleNotificationsClick}
            handleLogout={handleLogout}
            handleUpdateProfile={handleUpdateProfile}
            handleResetSystem={handleResetSystem}
            handleGradeSelect={handleGradeSelect}
            handleChangeGrade={handleChangeGrade}
            handleSubjectSelect={handleSubjectSelect}
            handleAddSubject={handleAddSubject}
            handleBackFromGenericView={handleBackFromGenericView}
            handleAddHistoryItem={handleAddHistoryItem}
            handleQuestionAnswered={handleQuestionAnswered}
            syncClassrooms={syncClassrooms}
            chatContext={chatContext}
            setChatContext={setChatContext}
            testPrepInitialData={testPrepInitialData}
            setTestPrepInitialData={setTestPrepInitialData}
            initialClassroomTab={initialClassroomTab}
            setInitialClassroomTab={setInitialClassroomTab}
            initialClassroomCreateMode={initialClassroomCreateMode}
            setInitialClassroomCreateMode={setInitialClassroomCreateMode}
            DB_KEY={DB_KEY}
            isParentVerificationNeeded={isParentVerificationNeeded}
            setIsParentVerificationNeeded={setIsParentVerificationNeeded}
            handleDeleteHistoryItem={handleDeleteHistoryItem}
            handleDeleteAllHistory={handleDeleteAllHistory}
            handleSaveChatSession={handleSaveChatSession}
            handleDeleteChatSession={handleDeleteChatSession}
            initialTeacherTab={initialTeacherTab}
            setInitialTeacherTab={setInitialTeacherTab}
            initialLessonPlan={initialLessonPlan}
            setInitialLessonPlan={setInitialLessonPlan}
            initialHistoryId={initialHistoryId}
            setInitialHistoryId={setInitialHistoryId}
            initialExamResult={initialExamResult}
            setInitialExamResult={setInitialExamResult}
            initialGrade={initialGrade}
            setInitialGrade={setInitialGrade}
            initialTopic={initialTopic}
            setInitialTopic={setInitialTopic}
          />
        )
      )}

      {/* Legal Modals */}
    </div>
  );
};

interface AppContentProps {
  user: User | null;
  updateUserData: (newData: Partial<User>) => void;
  isTeacher: boolean;
  isPro: boolean;
  checkAndIncrementAiLimit: (type: 'PRACTICE' | 'SUMMARY' | 'CHAT' | 'TEST_PREP') => boolean;
  allClassrooms: Classroom[];
  setAllClassrooms: (c: Classroom[]) => void;
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  stats: UserStats[];
  setStats: (s: UserStats[]) => void;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  selectedGrade: Grade | null;
  setSelectedGrade: (g: Grade | null) => void;
  selectedSubject: Subject | string | null;
  setSelectedSubject: (s: Subject | string | null) => void;
  userSubjects: (Subject | string)[];
  setUserSubjects: (s: (Subject | string)[]) => void;
  userName: string | null;
  setUserName: (n: string | null) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  previousViewMode: ViewMode;
  setPreviousViewMode: (v: ViewMode) => void;
  activeTab: 'practice' | 'chat' | 'resources' | 'test-prep' | 'games';
  setActiveTab: (t: 'practice' | 'chat' | 'resources' | 'test-prep' | 'games') => void;
  practiceConfig: PracticeConfig | null;
  setPracticeConfig: (p: PracticeConfig | null) => void;
  isGlobalEditorOpen: boolean;
  setIsGlobalEditorOpen: (o: boolean) => void;
  isMaterialFullscreen: boolean;
  setIsMaterialFullscreen: (f: boolean) => void;
  initialGlobalEditorData: ClassroomMaterial | null;
  setInitialGlobalEditorData: (d: ClassroomMaterial | null) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (o: boolean) => void;
  activeClassId: string | null;
  setActiveClassId: (i: string | null) => void;
  initialMaterialId: string | null;
  setInitialMaterialId: (i: string | null) => void;
  initialStudentId: string | null;
  setInitialStudentId: (i: string | null) => void;
  initialClassroomTab: 'MATERIALS' | 'CHAT' | 'STUDENTS' | 'ANALYTICS' | null;
  setInitialClassroomTab: (t: 'MATERIALS' | 'CHAT' | 'STUDENTS' | 'ANALYTICS' | null) => void;
  initialClassroomCreateMode: boolean;
  setInitialClassroomCreateMode: (m: boolean) => void;
  DB_KEY: string;
  handleHomeClick: () => void;
  handleHistoryClick: () => void;
  handleClassroomClick: () => void;
  handleLibraryClick: () => void;
  handleCoursesClick: () => void;
  handleAchievementsClick: () => void;
  handleCalendarClick: () => void;
  handleNotificationsClick: () => void;
  handleLogout: () => void;
  handleUpdateProfile: (name: string, photoUrl: string, settings: UserSettings, grade?: Grade) => void;
  handleUpgradeClick: () => void;
  handleResetSystem: () => void;
  handleGradeSelect: (grade: Grade) => void;
  handleChangeGrade: () => void;
  handleSubjectSelect: (subject: Subject | string) => void;
  handleAddSubject: (subjectName: string) => void;
  handleBackFromGenericView: () => void;
  handleAddHistoryItem: (item: HistoryItem) => void;
  handleQuestionAnswered: (question: Question, isCorrect: boolean) => void;
  syncClassrooms: (classrooms: Classroom[]) => Promise<void>;
  testPrepInitialData: {subject: Subject, grade: Grade, topic: string, days: number, attachment?: any} | null;
  setTestPrepInitialData: (d: {subject: Subject, grade: Grade, topic: string, days: number, attachment?: any} | null) => void;
  chatContext: string | null;
  setChatContext: (c: string | null) => void;
  isParentVerificationNeeded: boolean;
  setIsParentVerificationNeeded: (n: boolean) => void;
  handleDeleteHistoryItem: (id: string) => void;
  handleDeleteAllHistory: () => void;
  handleSaveChatSession: (session: ChatSession) => void;
  handleDeleteChatSession: (id: string) => void;
  initialTeacherTab?: 'OVERVIEW' | 'PLANNER' | 'CHAT' | 'EXAM_CHECKER';
  setInitialTeacherTab: (t: 'OVERVIEW' | 'PLANNER' | 'CHAT' | 'EXAM_CHECKER' | undefined) => void;
  initialLessonPlan: LessonPlan | null;
  setInitialLessonPlan: (p: LessonPlan | null) => void;
  initialHistoryId: string | null;
  setInitialHistoryId: (i: string | null) => void;
  initialExamResult: ExamCheckResult | null;
  setInitialExamResult: (r: ExamCheckResult | null) => void;
  initialGrade: Grade | null;
  setInitialGrade: (g: Grade | null) => void;
  initialTopic: string | null;
  setInitialTopic: (t: string | null) => void;
}

const AppContent: React.FC<AppContentProps> = ({
  user, updateUserData, isTeacher, isPro, checkAndIncrementAiLimit, allClassrooms, setAllClassrooms, history, setHistory, stats, setStats, notifications, setNotifications,
  selectedGrade, setSelectedGrade, selectedSubject, setSelectedSubject, userSubjects, setUserSubjects, userName, setUserName,
  viewMode, setViewMode, previousViewMode, setPreviousViewMode, activeTab, setActiveTab, practiceConfig, setPracticeConfig,
  isGlobalEditorOpen, setIsGlobalEditorOpen, isMaterialFullscreen, setIsMaterialFullscreen, initialGlobalEditorData, setInitialGlobalEditorData, isProfileModalOpen, setIsProfileModalOpen,
  activeClassId, setActiveClassId, initialMaterialId, setInitialMaterialId, initialStudentId, setInitialStudentId, 
  initialClassroomTab, setInitialClassroomTab, initialClassroomCreateMode, setInitialClassroomCreateMode,
  DB_KEY,
  handleHomeClick, handleHistoryClick, handleClassroomClick, handleLibraryClick, handleCoursesClick,
  handleAchievementsClick, handleCalendarClick, handleNotificationsClick, handleLogout, handleUpdateProfile, handleUpgradeClick, handleResetSystem,
  handleGradeSelect, handleChangeGrade, handleSubjectSelect, handleAddSubject, handleBackFromGenericView, handleAddHistoryItem,
  handleQuestionAnswered, syncClassrooms,
  chatContext, setChatContext,
  testPrepInitialData, setTestPrepInitialData,
  isParentVerificationNeeded, setIsParentVerificationNeeded,
  handleDeleteHistoryItem, handleDeleteAllHistory,
  handleSaveChatSession, handleDeleteChatSession,
  initialTeacherTab, setInitialTeacherTab,
  initialLessonPlan, setInitialLessonPlan,
  initialHistoryId, setInitialHistoryId,
  initialExamResult, setInitialExamResult,
  initialGrade, setInitialGrade,
  initialTopic, setInitialTopic
}) => {
  const navigate = useNavigate();
  const [isGeneratingTestPrep, setIsGeneratingTestPrep] = useState(false);
  const [lastGeneratedTestPrep, setLastGeneratedTestPrep] = useState<TestPrepPlan | null>(null);

  const recentMistakes = useMemo(() => {
    if (!selectedSubject) return [];
    return history.filter(item => item.subject === selectedSubject && item.type === 'PRACTICE' && !item.isCorrect).slice(-5).map(item => item.title);
  }, [history, selectedSubject]);

  const isMainToolVisible = ['PRACTICE', 'GAMES', 'CHAT'].includes(viewMode);
  const isClassroomView = viewMode === 'CLASSROOM';
  const isHeaderHidden = (viewMode === 'PRACTICE' || viewMode === 'CHAT' || viewMode === 'GAMES') || isGlobalEditorOpen || isMaterialFullscreen;

  const handleSaveDraft = useCallback((mat: ClassroomMaterial) => {
    const draftId = `draft-${mat.id}`;
    setHistory(prev => {
      const exists = prev.findIndex(item => item.id === draftId);
      const historyItem: HistoryItem = {
        id: draftId,
        timestamp: mat.timestamp,
        subject: mat.subject as Subject,
        grade: mat.grade as Grade,
        type: mat.type === 'SUMMARY' ? 'SUMMARY' : (mat.type === 'TEST' ? 'PRACTICE' : 'LESSON_PLAN'),
        title: `[טיוטה] ${mat.title}`,
        content: mat.content,
        details: mat
      };
      if (exists !== -1) {
        const newHistory = [...prev];
        newHistory[exists] = historyItem;
        return newHistory;
      }
      return [historyItem, ...prev];
    });
  }, [setHistory]);

  const handleStartTestPrepGeneration = async (subject: string, grade: Grade, topic: string, days: number, attachment?: any) => {
    if (isGeneratingTestPrep) return;
    
    setIsGeneratingTestPrep(true);
    try {
      const plan = await generateTestPrepPlan(subject, grade, topic, days, attachment, user?.learningProfile);
      if (plan) {
        setLastGeneratedTestPrep(plan);
        // Save to localStorage for the specific subject
        safeSetItem(`test_prep_${subject}`, JSON.stringify(plan));
        
        // Add notification if not in test prep view
        if (viewMode !== 'PRACTICE' || activeTab !== 'test-prep') {
          const newNotif: any = {
            id: Math.random().toString(36).substr(2, 9),
            title: 'הכנה למבחן מוכנה!',
            message: `תוכנית ההכנה שלך בנושא "${topic}" מוכנה ללמידה.`,
            timestamp: Date.now(),
            type: 'SYSTEM',
            read: false
          };
          setNotifications(prev => [newNotif, ...prev]);
        }
      }
    } catch (e) {
      console.error("Test prep generation failed", e);
    } finally {
      setIsGeneratingTestPrep(false);
    }
  };

  const handleOpenNotification = (notif: Notification) => {
    if (notif.classId) {
      const classroom = allClassrooms.find(c => c.id === notif.classId);
      if (classroom) {
        navigate(`/class/${classroom.code}`);
      } else {
        navigate(`/class/${notif.classId}`);
      }
      if (notif.materialId) setInitialMaterialId(notif.materialId);
      if (notif.studentId) setInitialStudentId(notif.studentId);
      if (notif.type === 'CHAT') {
        setInitialClassroomTab('CHAT');
      } else if (notif.type === 'SUBMISSION') {
        setInitialClassroomTab('MATERIALS');
      } else if (notif.type === 'MEETING') {
        setInitialClassroomTab('MATERIALS');
      }
    }
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true, isRead: true } : n));
    dbService.markNotificationRead(notif.id).catch(err => console.error("Failed to mark notification as read in Supabase:", err));
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col font-sans transition-colors ${user?.settings?.darkMode ? 'dark' : ''}`} dir="rtl">
      {!isHeaderHidden && (
        <Header 
          onHomeClick={handleHomeClick} onHistoryClick={handleHistoryClick} onClassroomClick={handleClassroomClick}
          onAchievementsClick={handleAchievementsClick} onCalendarClick={handleCalendarClick} onNotificationsClick={handleNotificationsClick}
          onLibraryClick={handleLibraryClick} onCoursesClick={handleCoursesClick} onLogout={handleLogout} onProfileClick={() => setIsProfileModalOpen(true)}
          selectedGrade={selectedGrade} onChangeGrade={handleChangeGrade} userName={userName} userPhoto={user?.photoUrl}
          userEmail={user?.email} userRole={user?.role} userSettings={user?.settings} unreadCount={notifications.filter(n => !n.isRead).length}
          onUpgradeClick={handleUpgradeClick} subscriptionType={user?.subscriptionType as any}
          schoolCode={user?.schoolCode}
        />
      )}

      <main className={`flex-1 flex flex-col w-full ${isHeaderHidden ? 'max-w-none' : 'max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10'} ${viewMode === 'GAMES' ? 'p-0 overflow-hidden' : 'py-8 pb-24 md:pb-12'}`}>
        {viewMode === 'DASHBOARD' && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {isTeacher ? (
              <TeacherDashboard 
                user={user} 
                isPro={isPro}
                history={history}
                checkAndIncrementAiLimit={checkAndIncrementAiLimit}
                onSelectClass={(id, materialId, studentId) => { 
                  const classroom = allClassrooms.find(c => c.id === id);
                  if (classroom) {
                    navigate(`/class/${classroom.code}`);
                  } else {
                    navigate(`/class/${id}`);
                  }
                  if (materialId) setInitialMaterialId(materialId);
                  if (studentId) setInitialStudentId(studentId);
                }} 
                onOpenTool={(tool) => {
                  if (tool === 'CHAT') setViewMode('CHAT');
                  else if (tool === 'MATERIALS') setIsGlobalEditorOpen(true);
                  else {
                    setInitialClassroomCreateMode(true);
                    setActiveClassId(null);
                    setViewMode('CLASSROOM');
                  }
                }} 
                onAddHistoryItem={handleAddHistoryItem} 
                onUpgrade={handleUpgradeClick}
                initialTeacherTab={initialTeacherTab}
                initialLessonPlan={initialLessonPlan}
                initialHistoryId={initialHistoryId}
                initialExamResult={initialExamResult}
                initialGrade={initialGrade}
                initialTopic={initialTopic}
              />
            ) : (
              !selectedGrade ? <SubjectSelector mode="GRADE_SELECTION" selectedSubject={selectedSubject as Subject} selectedGrade={selectedGrade} userName={userName} onSelectSubject={handleSubjectSelect} onSelectGrade={handleGradeSelect} userSubjects={userSubjects.filter(s => s !== Subject.OTHER)} onAddSubject={handleAddSubject} aiRequestsToday={user?.aiRequestsToday || 0} onProClick={() => setViewMode('SUBSCRIPTION')} />
              : <>
                  <SubjectSelector mode="SUBJECT_SELECTION" selectedSubject={selectedSubject as Subject} selectedGrade={selectedGrade} userName={userName} onSelectSubject={handleSubjectSelect} onSelectGrade={handleGradeSelect} isTeacher={false} userSubjects={userSubjects.filter(s => s !== Subject.OTHER)} onAddSubject={handleAddSubject} aiRequestsToday={user?.aiRequestsToday || 0} onProClick={() => setViewMode('SUBSCRIPTION')} />
                  {user.settings?.showProgressStats !== false && stats.some(s => s.total > 0) && <div className="max-w-4xl mx-auto w-full mt-8"><ProgressChart stats={stats} /></div>}
                </>
            )}
          </div>
        )}

        {viewMode === 'COURSES' && <CoursesView subject={selectedSubject as Subject || Subject.MATH} grade={selectedGrade || Grade.GRADE_10} />}
        {viewMode === 'SUBSCRIPTION' && (
          <SubscriptionView 
            user={user} 
            onUpdateSubscription={(type) => updateUserData({ subscriptionType: type })} 
            onBack={handleHomeClick} 
          />
        )}
        {viewMode === 'LIBRARY' && isTeacher && <LibraryView user={user} onBack={handleBackFromGenericView} onAddHistoryItem={handleAddHistoryItem} onUpdateUser={(u) => { updateUserData(u); }} />}
        {viewMode === 'HISTORY' && (isTeacher ? <MaterialRepositoryView history={history} onBack={handleBackFromGenericView} onCreateNew={() => setIsGlobalEditorOpen(true)} onOpenItem={(item) => { 
          if (item.type === 'EXAM_CHECK') {
            setInitialExamResult(item.details);
            setInitialGrade(item.grade);
            setInitialTopic(item.subject);
            setInitialTeacherTab('EXAM_CHECKER');
            setViewMode('DASHBOARD');
            navigate('/');
          } else if (item.type === 'LESSON_PLAN' && item.id.startsWith('plan-')) {
            setInitialLessonPlan(item.details);
            setInitialHistoryId(item.id);
            setInitialGrade(item.grade);
            setInitialTopic(item.subject);
            setInitialTeacherTab('PLANNER');
            setViewMode('DASHBOARD');
            navigate('/');
          } else if (item.type === 'PRESENTATION') {
            setInitialLessonPlan({
              title: item.title,
              subject: item.subject as Subject,
              objectives: [],
              introduction: '',
              mainContent: '',
              summary: '',
              resourcesNeeded: [],
              presentation: item.details
            });
            setInitialHistoryId(item.id);
            setInitialGrade(item.grade);
            setInitialTopic(item.subject);
            setInitialTeacherTab('PLANNER');
            setViewMode('DASHBOARD');
            navigate('/');
          } else if (item.type === 'INFOGRAPHIC') {
            setInitialLessonPlan({
              title: item.title,
              subject: item.subject as Subject,
              objectives: [],
              introduction: '',
              mainContent: '',
              summary: '',
              resourcesNeeded: [],
              infographic: item.details
            });
            setInitialHistoryId(item.id);
            setInitialGrade(item.grade);
            setInitialTopic(item.subject);
            setInitialTeacherTab('PLANNER');
            setViewMode('DASHBOARD');
            navigate('/');
          } else {
            setInitialGlobalEditorData(item.details || item); 
            setIsGlobalEditorOpen(true); 
          }
        }} onDeleteItem={handleDeleteHistoryItem} /> : <HistoryView history={history} onBack={handleBackFromGenericView} onOpenSummary={(item) => setViewMode('PRACTICE')} isTeacher={isTeacher} onDeleteItem={handleDeleteHistoryItem} onDeleteAll={handleDeleteAllHistory} />)}
        {viewMode === 'ACHIEVEMENTS' && !isTeacher && <AchievementView user={user} history={history} onBack={handleBackFromGenericView} />}
        {viewMode === 'CALENDAR' && !isTeacher && (
          <CalendarView 
            user={user} 
            notifications={notifications}
            onBack={handleBackFromGenericView} 
            onOpenClassroom={(id, matId) => { 
              const classroom = allClassrooms.find(c => c.id === id);
              if (classroom) {
                navigate(`/class/${classroom.code}`);
              } else {
                navigate(`/class/${id}`);
              }
              setInitialMaterialId(matId || null);
            }} 
            onOpenChat={(id) => {
              const classroom = allClassrooms.find(c => c.id === id);
              if (classroom) {
                navigate(`/class/${classroom.code}`);
              } else {
                navigate(`/class/${id}`);
              }
              setInitialClassroomTab('CHAT');
            }}
          />
        )}
        {viewMode === 'NOTIFICATIONS' && (
          <NotificationsView 
            notifications={notifications} 
            onBack={handleBackFromGenericView} 
            onOpenNotification={handleOpenNotification} 
          />
        )}
        {viewMode === 'CLASSROOM' && (
          <ClassroomView 
            user={user} 
            initialClassId={activeClassId} 
            initialMaterialId={initialMaterialId} 
            initialStudentId={initialStudentId} 
            initialTab={initialClassroomTab}
            initialCreateMode={initialClassroomCreateMode}
            onBack={handleHomeClick} 
            onToggleFullscreen={setIsMaterialFullscreen}
            onStartTestPrep={(subject, grade, topic, days, attachment) => {
              setTestPrepInitialData({ subject, grade, topic, days, attachment });
              setSelectedSubject(subject);
              setSelectedGrade(grade);
              setViewMode('PRACTICE');
              setActiveTab('test-prep');
            }} 
            onAddHistoryItem={handleAddHistoryItem} 
            isPro={isPro} 
            checkAndIncrementAiLimit={checkAndIncrementAiLimit} 
          />
        )}

        {isMainToolVisible && (
          <div className={`flex flex-col lg:flex-row gap-8 flex-1 ${viewMode === 'GAMES' ? '' : 'animate-fade-in'}`}>
            {isTeacher && viewMode !== 'GAMES' && (
              <div className="hidden lg:flex lg:w-1/4 flex-col gap-6 no-print p-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border-l border-gray-100 sticky top-6">
                  <div className="mb-6 pb-6 border-b border-gray-100">
                    <button onClick={handleHomeClick} className="w-full p-3 bg-gray-50 hover:bg-primary hover:text-white rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-gray-600">
                      <ArrowRight size={20} />
                      <span>חזרה ללוח הבקרה</span>
                    </button>
                  </div>
                  <nav className="flex flex-col gap-3">
                      <button onClick={() => {
                        const subjectSlug = selectedSubject ? (SUBJECT_SLUGS[selectedSubject] || encodeURIComponent(selectedSubject)) : 'practice';
                        navigate(`/${subjectSlug}/practice`);
                        setActiveTab('practice');
                      }} className={`p-4 rounded-xl flex items-center gap-3 transition-all text-right font-medium ${activeTab === 'practice' ? 'bg-blue-50 text-primary' : 'text-gray-600'}`}><PenTool size={22} /><span>תרגול שאלות</span></button>
                      <button onClick={() => {
                        const subjectSlug = selectedSubject ? (SUBJECT_SLUGS[selectedSubject] || encodeURIComponent(selectedSubject)) : 'practice';
                        navigate(`/${subjectSlug}/resources`);
                        setActiveTab('resources');
                      }} className={`p-4 rounded-xl flex items-center gap-3 transition-all text-right font-medium ${activeTab === 'resources' ? 'bg-green-50 text-green-600' : 'text-gray-600'}`}><BookOpen size={22} /><span>חומרי לימוד</span></button>
                      <button onClick={() => {
                        const subjectSlug = selectedSubject ? (SUBJECT_SLUGS[selectedSubject] || encodeURIComponent(selectedSubject)) : 'practice';
                        navigate(`/${subjectSlug}/testprep`);
                        setActiveTab('test-prep');
                      }} className={`p-4 rounded-xl flex items-center gap-3 transition-all text-right font-medium ${activeTab === 'test-prep' ? 'bg-amber-50 text-amber-700' : 'text-gray-600'}`}><Calendar size={22} /><span>הכנה למבחן</span></button>
                      <button onClick={() => {
                        const subjectSlug = selectedSubject ? (SUBJECT_SLUGS[selectedSubject] || encodeURIComponent(selectedSubject)) : 'practice';
                        navigate(`/${subjectSlug}/games`);
                        setActiveTab('games');
                      }} className={`p-4 rounded-xl flex items-center gap-3 transition-all text-right font-medium ${activeTab === 'games' ? 'bg-red-50 text-red-600' : 'text-gray-600'}`}><Gamepad2 size={22} /><span>משחקי למידה</span></button>
                      <button onClick={() => {
                        const subjectSlug = selectedSubject ? (SUBJECT_SLUGS[selectedSubject] || encodeURIComponent(selectedSubject)) : 'practice';
                        navigate(`/${subjectSlug}/chat`);
                        setActiveTab('chat');
                      }} className={`p-4 rounded-xl flex items-center gap-3 transition-all text-right font-medium ${activeTab === 'chat' ? 'bg-indigo-50 text-accent' : 'text-gray-600'}`}><MessageCircle size={22} /><span>צ'אט עם מורה</span></button>
                  </nav>
                </div>
              </div>
            )}
            <div className={`flex flex-col flex-1 ${isTeacher ? (viewMode === 'GAMES' ? 'w-full' : 'lg:w-3/4 p-6') : (viewMode === 'GAMES' ? 'w-full' : 'w-full p-6 md:p-10')}`}>
                {!isTeacher && (
                  <div className="flex flex-wrap gap-4 mb-8 no-print shrink-0">
                    <button onClick={handleHomeClick} className="px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-sm bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"><ArrowRight size={18} /><span>חזרה</span></button>
                    <div className="w-px h-10 bg-gray-200 mx-2 hidden sm:block" />
                    <button onClick={() => {
                      const subjectSlug = selectedSubject ? (SUBJECT_SLUGS[selectedSubject] || encodeURIComponent(selectedSubject)) : 'practice';
                      navigate(`/${subjectSlug}/practice`);
                      setActiveTab('practice');
                    }} className={`px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-sm ${activeTab === 'practice' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><PenTool size={18} /><span>תרגול</span></button>
                    <button onClick={() => {
                      const subjectSlug = selectedSubject ? (SUBJECT_SLUGS[selectedSubject] || encodeURIComponent(selectedSubject)) : 'practice';
                      navigate(`/${subjectSlug}/resources`);
                      setActiveTab('resources');
                    }} className={`px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-sm ${activeTab === 'resources' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><BookOpen size={18} /><span>חומרים</span></button>
                    <button onClick={() => {
                      const subjectSlug = selectedSubject ? (SUBJECT_SLUGS[selectedSubject] || encodeURIComponent(selectedSubject)) : 'practice';
                      navigate(`/${subjectSlug}/testprep`);
                      setActiveTab('test-prep');
                    }} className={`px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-sm ${activeTab === 'test-prep' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><Calendar size={18} /><span>הכנה למבחן</span></button>
                    <button onClick={() => {
                      const subjectSlug = selectedSubject ? (SUBJECT_SLUGS[selectedSubject] || encodeURIComponent(selectedSubject)) : 'practice';
                      navigate(`/${subjectSlug}/games`);
                      setActiveTab('games');
                    }} className={`px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-sm ${activeTab === 'games' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><Gamepad2 size={18} /><span>משחקים</span></button>
                    <button onClick={() => {
                      const subjectSlug = selectedSubject ? (SUBJECT_SLUGS[selectedSubject] || encodeURIComponent(selectedSubject)) : 'practice';
                      navigate(`/${subjectSlug}/chat`);
                      setActiveTab('chat');
                    }} className={`px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-sm ${activeTab === 'chat' ? 'bg-accent text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><MessageCircle size={18} /><span>צ'אט</span></button>
                  </div>
                )}
                {activeTab === 'practice' && <PracticeArea subject={selectedSubject as Subject} grade={selectedGrade!} onQuestionAnswered={handleQuestionAnswered} recentMistakes={recentMistakes} isTeacher={isTeacher} user={user} isPro={isPro} checkAndIncrementAiLimit={checkAndIncrementAiLimit} onBack={handleBackFromGenericView} />}
                {activeTab === 'resources' && <ResourcesView subject={selectedSubject as Subject} grade={selectedGrade!} onStartTest={(config) => { setPracticeConfig(config); setActiveTab('practice'); }} onSummaryGenerated={(title, content) => handleAddHistoryItem({ id: Date.now().toString(), timestamp: Date.now(), subject: selectedSubject as Subject, grade: selectedGrade!, type: 'SUMMARY', title, content })} onHelpWithContent={(context) => { setChatContext(context); setActiveTab('chat'); }} isTeacher={isTeacher} user={user} isPro={isPro} checkAndIncrementAiLimit={checkAndIncrementAiLimit} />}
                {activeTab === 'test-prep' && (
                  <TestPrepView 
                    subject={selectedSubject as Subject} 
                    grade={selectedGrade!} 
                    isTeacher={isTeacher} 
                    user={user} 
                    checkAndIncrementAiLimit={checkAndIncrementAiLimit} 
                    initialData={testPrepInitialData}
                    onClearInitialData={() => setTestPrepInitialData(null)}
                    isGeneratingExternal={isGeneratingTestPrep}
                    onStartGenerationExternal={handleStartTestPrepGeneration}
                  />
                )}
                {activeTab === 'games' && (
                  <div className="flex-1 flex flex-col">
                    <LearningGamesView 
                      user={user!} 
                      subject={selectedSubject as Subject}
                      grade={selectedGrade!}
                      onBack={handleHomeClick} 
                      onAddHistoryItem={handleAddHistoryItem} 
                    />
                  </div>
                )}
                {activeTab === 'chat' && (
                  <ChatBot 
                    subject={selectedSubject as Subject} 
                    grade={selectedGrade} 
                    userName={userName} 
                    initialMessage={chatContext} 
                    isTeacher={isTeacher} 
                    isPro={isPro} 
                    schoolCode={user?.schoolCode} 
                    checkAndIncrementAiLimit={checkAndIncrementAiLimit}
                    chatHistory={user?.chatHistory || []}
                    onSaveSession={handleSaveChatSession}
                    onDeleteSession={handleDeleteChatSession}
                    onBack={handleBackFromGenericView}
                  />
                )}
            </div>
          </div>
        )}
      </main>

      {isGlobalEditorOpen && (
        <GlobalContentEditor 
          user={user!} 
          classrooms={allClassrooms.filter(c => c.teacherId === user!.id)} 
          initialMaterial={initialGlobalEditorData}
          isPro={isPro}
          checkAndIncrementAiLimit={checkAndIncrementAiLimit}
          onClose={() => {
            setIsGlobalEditorOpen(false);
            setInitialGlobalEditorData(null);
          }} 
          onSaveDraft={handleSaveDraft}
          onPublish={(mat, targetClassIds) => {
            // Check material repository limit for free users
            if (!isPro) {
              const subjectItemsCount = history.filter(item => item.subject === mat.subject).length;
              if (subjectItemsCount >= 5) {
                alert("הגעת למגבלה של 5 פריטים למקצוע במאגר החומרים בתוכנית החינמית.");
                return;
              }
            }

            // Save to history repository
            const historyItem: HistoryItem = {
              id: `repo-${mat.id}`,
              timestamp: mat.timestamp,
              subject: mat.subject as Subject,
              grade: mat.grade as Grade,
              type: mat.type === 'SUMMARY' ? 'SUMMARY' : 
                    (mat.type === 'TEST' ? 'TEST' : 
                    (mat.type === 'ASSIGNMENT' ? 'ASSIGNMENT' : 
                    (mat.type === 'GAME' ? 'GAME' : 
                    (mat.type === 'UPCOMING_TEST' ? 'UPCOMING_TEST' : 'LESSON_PLAN')))),
              title: mat.title,
              content: mat.content,
              details: mat
            };
            handleAddHistoryItem(historyItem);

            // Update classrooms if any targeted
            if (targetClassIds.length > 0) {
              const updatedClassrooms = allClassrooms.map(c => {
                if (targetClassIds.includes(c.id)) {
                  return { ...c, materials: [mat, ...(c.materials || [])] };
                }
                return c;
              });
              setAllClassrooms(updatedClassrooms);
              syncClassrooms(updatedClassrooms);
              safeSetItem(DB_KEY, JSON.stringify(updatedClassrooms));
              window.dispatchEvent(new Event('lumdim-db-updated'));
            }

            setIsGlobalEditorOpen(false);
            setInitialGlobalEditorData(null);
          }} 
        />
      )}
      {isParentVerificationNeeded && user && (
        <ParentVerificationModal 
          userId={user.id} 
          onVerified={() => {
            setIsParentVerificationNeeded(false);
            safeRemoveItem('pending_over_13');
            updateUserData({ isParentVerified: true, isOver13: false });
          }} 
        />
      )}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        userName={userName || ''} 
        userPhoto={user?.photoUrl || ''} 
        userGrade={user?.grade || selectedGrade || Grade.NOT_DEFINED}
        userRole={user?.role}
        userSettings={user?.settings} 
        onUpdate={handleUpdateProfile} 
        onResetSystem={handleResetSystem}
        onLogout={handleLogout}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainContent />} />
        <Route path="/class" element={<MainContent />} />
        <Route path="/class/:classCode" element={<MainContent />} />
        <Route path="/library" element={<MainContent />} />
        <Route path="/subscription" element={<MainContent />} />
        <Route path="/history" element={<MainContent />} />
        <Route path="/achievements" element={<MainContent />} />
        <Route path="/calendar" element={<MainContent />} />
        <Route path="/notifications" element={<MainContent />} />
        <Route path="/practice" element={<MainContent />} />
        <Route path="/practice/:subject/:column" element={<MainContent />} />
        <Route path="/:subject/:column" element={<MainContent />} />
        <Route path="/chat" element={<MainContent />} />
        <Route path="/games" element={<MainContent />} />
        <Route path="/courses" element={<MainContent />} />
        <Route path="/resources" element={<MainContent />} />
        <Route path="/test-prep" element={<MainContent />} />
        <Route path="/policies/privacy" element={<PrivacyView onBack={() => window.history.back()} />} />
        <Route path="/policies/terms" element={<TermsOfUseView onBack={() => window.history.back()} />} />
        <Route path="*" element={<MainContent />} />
      </Routes>
      <CookieBanner />
      <Footer 
          onShowPrivacy={() => window.location.href = '/policies/privacy'} 
          onShowTerms={() => window.location.href = '/policies/terms'} 
        />
    </BrowserRouter>
  );
};

export default App;
