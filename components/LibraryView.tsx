import React, { useState, useMemo, useEffect } from 'react';
import { ClassroomMaterial, Subject, User, HistoryItem, MaterialType, Grade, Classroom } from '../types.ts';
import { Library, Search, Filter, Heart, Eye, Download, Send, ChevronLeft, ArrowRight, ArrowLeft, User as UserIcon, BookOpen, Clock, FileText, ListChecks, ClipboardList, BellRing, Upload, Star, X, School, SortAsc, BookmarkCheck, Edit, Trash2, Video } from 'lucide-react';
import LatexRenderer from './LatexRenderer.tsx';
import GlobalContentEditor from './GlobalContentEditor.tsx';

const DB_KEY = 'lumdim_global_database_v1';
const LIBRARY_KEY = 'lumdim_library_v1';

interface LibraryViewProps {
  user: User;
  onBack: () => void;
  onAddHistoryItem: (item: HistoryItem) => void;
  onUpdateUser: (user: User) => void;
}

type SortMode = 'LATEST' | 'VIEWS' | 'LIKES' | 'USAGE';
type LibraryMode = 'COMMUNITY' | 'MY_SAVED' | 'MY_UPLOADS';

const LibraryView: React.FC<LibraryViewProps> = ({ user, onBack, onAddHistoryItem, onUpdateUser }) => {
  const [libraryItems, setLibraryItems] = useState<ClassroomMaterial[]>([]);
  const [libraryMode, setLibraryMode] = useState<LibraryMode>('COMMUNITY');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<MaterialType | 'ALL'>('ALL');
  const [showUpcomingTests, setShowUpcomingTests] = useState(true);
  const [minViews, setMinViews] = useState<string>('');
  const [minHearts, setMinHearts] = useState<string>('');
  const [minUsage, setMinUsage] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('LATEST');
  const [showFilters, setShowFilters] = useState(false);
  const [activeItem, setActiveItem] = useState<ClassroomMaterial | null>(null);
  const [activeViewerPageIndex, setActiveViewerPageIndex] = useState(0);
  const [showClassPublish, setShowClassPublish] = useState(false);
  const [userClassrooms, setUserClassrooms] = useState<Classroom[]>([]);

  const isTeacher = user.role === 'TEACHER';

  useEffect(() => {
    const loadLibrary = () => {
      const data = localStorage.getItem(LIBRARY_KEY);
      if (data) {
        setLibraryItems(JSON.parse(data));
      }
    };
    loadLibrary();
    
    const dbData = localStorage.getItem(DB_KEY);
    if (dbData) {
        const all = JSON.parse(dbData) as Classroom[];
        setUserClassrooms(all.filter(c => c.teacherId === user.id));
    }

    window.addEventListener('storage', loadLibrary);
    return () => window.removeEventListener('storage', loadLibrary);
  }, [user.id]);

  const incrementMetric = (itemId: string, metric: 'views' | 'likes' | 'usages', isAdd: boolean = true) => {
    const updated = libraryItems.map(item => {
      if (item.id === itemId) {
        const currentVal = item[metric] || 0;
        return { ...item, [metric]: isAdd ? currentVal + 1 : Math.max(0, currentVal - 1) };
      }
      return item;
    });
    setLibraryItems(updated);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(updated));
  };

  const handleLike = (itemId: string) => {
    const likedIds = user.likedMaterialIds || [];
    const isLiked = likedIds.includes(itemId);
    
    const newLikedIds = isLiked 
        ? likedIds.filter(id => id !== itemId) 
        : [...likedIds, itemId];
    
    onUpdateUser({ ...user, likedMaterialIds: newLikedIds });
    incrementMetric(itemId, 'likes', !isLiked);
  };

  const handleOpenItem = (item: ClassroomMaterial) => {
    setActiveItem(item);
    setActiveViewerPageIndex(0);
    
    const viewedIds = user.viewedMaterialIds || [];
    if (!viewedIds.includes(item.id)) {
        const newViewed = [...viewedIds, item.id];
        onUpdateUser({ ...user, viewedMaterialIds: newViewed });
        incrementMetric(item.id, 'views');
    }
  };

  const detectSubject = (item: ClassroomMaterial): Subject | string => {
    if (item.subject) return item.subject;
    const combinedText = (item.title + " " + item.content).toLowerCase();
    if (combinedText.includes('מתמטיקה') || combinedText.includes('חשבון') || combinedText.includes('פונקציה') || combinedText.includes('משוואה')) return Subject.MATH;
    if (combinedText.includes('אנגלית') || combinedText.includes('english') || combinedText.includes('tense')) return Subject.ENGLISH;
    if (combinedText.includes('היסטוריה') || combinedText.includes('מהפכה') || combinedText.includes('מלחמ')) return Subject.HISTORY;
    if (combinedText.includes('מדע') || combinedText.includes('פיזיקה') || combinedText.includes('ביולוגיה')) return Subject.SCIENCE;
    if (combinedText.includes('לשון') || combinedText.includes('עברית') || combinedText.includes('תחביר')) return Subject.HEBREW;
    if (combinedText.includes('תנ"ך') || combinedText.includes('מקרא') || combinedText.includes('פסוק')) return Subject.BIBLE;
    if (combinedText.includes('אזרחות') || combinedText.includes('דמוקרטיה')) return Subject.CIVICS;
    if (combinedText.includes('גיאוגרפיה') || combinedText.includes('אקלים')) return Subject.GEOGRAPHY;
    return Subject.MATH; // Default
  }

  const handleSaveToRepo = (item: ClassroomMaterial) => {
    onAddHistoryItem({
        id: `lib-save-${Date.now()}`,
        timestamp: Date.now(),
        subject: detectSubject(item),
        grade: Grade.NOT_DEFINED,
        type: item.type === 'SUMMARY' ? 'SUMMARY' : 'PRACTICE',
        title: isTeacher ? `שמור מהספרייה: ${item.title}` : `סיכום שמור: ${item.title}`,
        content: item.content,
        isCorrect: true,
        details: item
    });

    const usedIds = (user as any).usedMaterialIds || [];
    if (!usedIds.includes(item.id)) {
        onUpdateUser({ ...user, usedMaterialIds: [...usedIds, item.id] } as any);
        incrementMetric(item.id, 'usages');
    }
    
    alert(isTeacher ? 'החומר נשמר במאגר החומרים שלך!' : 'הסיכום נשמר בסיכומים שלי!');
  };

  const handlePublishToClasses = (classIds: string[]) => {
    if (!activeItem) return;
    const db = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
    const updatedDb = db.map((c: Classroom) => {
        if (classIds.includes(c.id)) {
            return { ...c, materials: [{...activeItem, id: `lib-pub-${Date.now()}-${c.id}`, timestamp: Date.now()}, ...c.materials] };
        }
        return c;
    });
    localStorage.setItem(DB_KEY, JSON.stringify(updatedDb));
    
    const usedIds = (user as any).usedMaterialIds || [];
    if (!usedIds.includes(activeItem.id)) {
        onUpdateUser({ ...user, usedMaterialIds: [...usedIds, activeItem.id] } as any);
        incrementMetric(activeItem.id, 'usages');
    }

    setShowClassPublish(false);
    alert(`החומר פורסם ל-${classIds.length} כיתות!`);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך להסיר חומר זה מהספרייה?')) return;
    
    // Use functional update to ensure we have the latest state
    setLibraryItems(prev => {
      const updated = prev.filter(item => item.id !== itemId);
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(updated));
      return updated;
    });
    
    alert('החומר הוסר מהספרייה בהצלחה');
  };

  const filteredAndSortedItems = useMemo(() => {
    let baseItems = libraryItems;
    
    if (libraryMode === 'MY_SAVED') {
      const likedIds = user.likedMaterialIds || [];
      baseItems = libraryItems.filter(item => likedIds.includes(item.id));
    } else if (libraryMode === 'MY_UPLOADS') {
      baseItems = libraryItems.filter(item => item.authorId === user.id);
    }

    let result = baseItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = selectedSubject === 'ALL' || item.subject === selectedSubject;
      const matchesType = selectedType === 'ALL' || item.type === selectedType;
      
      if (!showUpcomingTests && item.type === 'UPCOMING_TEST') return false;

      const views = item.views || 0;
      const hearts = item.likes || 0;
      const usage = item.usages || 0;

      const mv = minViews ? parseInt(minViews) : 0;
      const mh = minHearts ? parseInt(minHearts) : 0;
      const mus = minUsage ? parseInt(minUsage) : 0;

      return matchesSearch && matchesSubject && matchesType && views >= mv && hearts >= mh && usage >= mus;
    });

    switch (sortMode) {
      case 'VIEWS': result.sort((a, b) => (b.views || 0) - (a.views || 0)); break;
      case 'LIKES': result.sort((a, b) => (b.likes || 0) - (a.likes || 0)); break;
      case 'USAGE': result.sort((a, b) => (b.usages || 0) - (a.usages || 0)); break;
      case 'LATEST': result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); break;
    }

    return result;
  }, [libraryItems, searchTerm, selectedSubject, selectedType, showUpcomingTests, minViews, minHearts, minUsage, sortMode, libraryMode, user.likedMaterialIds]);

  const getTypeIcon = (type: MaterialType) => {
    switch (type) {
      case 'SUMMARY': return <FileText size={20} className="text-blue-500" />;
      case 'TEST': return <ListChecks size={20} className="text-indigo-500" />;
      case 'ASSIGNMENT': return <ClipboardList size={20} className="text-emerald-500" />;
      case 'UPCOMING_TEST': return <BellRing size={20} className="text-orange-500" />;
      case 'UPLOADED_FILE': return <Upload size={20} className="text-blue-600" />;
      default: return <BookOpen size={20} className="text-gray-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in text-right" dir="rtl">
      {activeItem ? (
        <div className="animate-fade-in space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setActiveItem(null)} className="p-3 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 shadow-sm transition-all group">
              <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="flex gap-3">
              <button 
                onClick={() => handleSaveToRepo(activeItem)}
                className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-black transition-all flex items-center gap-2"
              >
                <Download size={18} />
                <span>{isTeacher ? 'שמור במאגר שלי' : 'שמור בסיכומים שלי'}</span>
              </button>
              {isTeacher && (
                <button 
                  onClick={() => setShowClassPublish(true)}
                  className="bg-primary text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2"
                >
                  <Send size={18} />
                  <span>פרסם לכיתות שלי</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
             <div className="p-10 md:p-14 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                   <div className="bg-white p-3 rounded-2xl shadow-sm">{getTypeIcon(activeItem.type)}</div>
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeItem.subject} • {activeItem.grade}</span>
                </div>
                <h2 className="text-4xl font-black text-gray-900 mb-2">{activeItem.title}</h2>
                <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                   <UserIcon size={14} />
                   <span>מאת: {activeItem.authorName || 'מורה מהקהילה'}</span>
                </div>
             </div>
             <div className="p-10 md:p-14 overflow-y-auto max-h-[600px] no-scrollbar">
                {activeItem.pages && activeItem.pages.length > 0 ? (
                  <div className="space-y-12">
                    <div key={activeItem.pages[activeViewerPageIndex].id} className="mb-12">
                      <h4 className="text-2xl font-black text-gray-900 mb-6 border-b-2 border-indigo-100 pb-2">עמוד {activeViewerPageIndex + 1} מתוך {activeItem.pages.length}</h4>
                      {activeItem.pages[activeViewerPageIndex].blocks.map((block) => (
                        <div key={block.id} className="mb-6">
                          {block.type === 'TEXT' || block.type === 'SUMMARY' ? (
                            <LatexRenderer text={block.content} />
                          ) : block.type === 'IMAGE' ? (
                            <img src={block.content} alt="Content" className="w-full rounded-2xl shadow-sm" referrerPolicy="no-referrer" />
                          ) : block.type === 'VIDEO' ? (
                            <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                              <Video size={48} />
                              <span className="mr-2 font-bold">סרטון: {block.content}</span>
                            </div>
                          ) : (
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-500 italic text-sm">
                              בלוק מסוג {block.type}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {activeItem.pages.length > 1 && (
                      <div className="flex justify-between items-center mt-8">
                        <button 
                          onClick={() => setActiveViewerPageIndex(p => Math.max(0, p - 1))}
                          disabled={activeViewerPageIndex === 0}
                          className="px-6 py-2 bg-gray-100 rounded-xl font-bold disabled:opacity-50"
                        >
                          הקודם
                        </button>
                        <button 
                          onClick={() => setActiveViewerPageIndex(p => Math.min(activeItem.pages!.length - 1, p + 1))}
                          disabled={activeViewerPageIndex === activeItem.pages.length - 1}
                          className="px-6 py-2 bg-primary text-white rounded-xl font-bold disabled:opacity-50"
                        >
                          הבא
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <LatexRenderer text={activeItem.content} />
                )}
                {activeItem.questions && activeItem.questions.length > 0 && (
                   <div className="mt-12 pt-12 border-t border-gray-100">
                      <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><ListChecks className="text-indigo-500" /> שאלות תרגול</h3>
                      <div className="space-y-6">
                         {activeItem.questions.map((q, i) => (
                            <div key={q.id} className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                               <h4 className="font-bold text-lg mb-4">{i+1}. <LatexRenderer text={q.text} /></h4>
                               {q.type === 'MCQ' ? (
                                  <div className="grid gap-2">
                                     {q.options.map((opt, oi) => (
                                        <div key={oi} className={`p-3 rounded-xl border-2 bg-white ${oi === q.correctIndex ? 'border-green-500' : 'border-transparent opacity-60'}`}><LatexRenderer text={opt} /></div>
                                     ))}
                                  </div>
                               ) : (
                                  <div className="p-4 bg-white rounded-xl border-2 border-indigo-100 text-indigo-700 italic">תשובת מודל: <LatexRenderer text={q.modelAnswer || ''} /></div>
                               )}
                            </div>
                         ))}
                      </div>
                   </div>
                )}
             </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 flex-1">
              <button onClick={onBack} className="p-4 bg-white hover:bg-gray-50 rounded-3xl border border-gray-100 shadow-sm transition-all group">
                <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <div>
                <div className="bg-blue-100 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-blue-600 shadow-xl mb-4"><Library size={32} /></div>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-2">ספריית קהילה</h2>
                <p className="text-xl text-gray-500 font-medium">גלו חומרי לימוד וסיכומים שפורסמו על ידי הקהילה</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-4">
              <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex">
                <button 
                  onClick={() => setLibraryMode('COMMUNITY')} 
                  className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${libraryMode === 'COMMUNITY' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  כל החומרים
                </button>
                {isTeacher && (
                  <button 
                    onClick={() => setLibraryMode('MY_UPLOADS')} 
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${libraryMode === 'MY_UPLOADS' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Upload size={16} />
                    <span>החומרים שלי</span>
                  </button>
                )}
                <button 
                  onClick={() => setLibraryMode('MY_SAVED')} 
                  className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${libraryMode === 'MY_SAVED' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <BookmarkCheck size={16} />
                  <span>הסיכומים השמורים שלי</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 mb-10">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  placeholder={libraryMode === 'COMMUNITY' ? "חיפוש חומרים בקהילה..." : libraryMode === 'MY_UPLOADS' ? "חיפוש בחומרים שלי..." : "חיפוש בסיכומים שלי..."}
                  className="w-full p-4 pr-12 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-primary/20 font-bold"
                />
                <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="flex flex-wrap gap-2">
                 <button 
                  onClick={() => setShowFilters(!showFilters)} 
                  className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-2 font-black ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                 >
                    <Filter size={20}/>
                    <span>מסננים</span>
                 </button>
                 <select 
                  value={sortMode} 
                  onChange={e => setSortMode(e.target.value as SortMode)} 
                  className="p-4 bg-gray-50 rounded-2xl outline-none font-black text-gray-700 cursor-pointer min-w-[140px]"
                 >
                    <option value="LATEST">הכי חדש</option>
                    <option value="VIEWS">הכי הרבה צפיות</option>
                    <option value="LIKES">הכי הרבה לבבות</option>
                    <option value="USAGE">הכי הרבה שימושים</option>
                 </select>
                 <select 
                  value={selectedSubject} 
                  onChange={e => setSelectedSubject(e.target.value as any)} 
                  className="p-4 bg-gray-50 rounded-2xl outline-none font-black text-gray-700 cursor-pointer min-w-[140px]"
                 >
                    <option value="ALL">כל המקצועות</option>
                    {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
                 <select 
                  value={selectedType} 
                  onChange={e => setSelectedType(e.target.value as any)} 
                  className="p-4 bg-gray-50 rounded-2xl outline-none font-black text-gray-700 cursor-pointer min-w-[140px]"
                 >
                    <option value="ALL">כל הסוגים</option>
                    <option value="SUMMARY">סיכום</option>
                    <option value="TEST">מבחן/תרגול</option>
                    <option value="ASSIGNMENT">מטלה</option>
                    <option value="UPCOMING_TEST">התראה על מבחן</option>
                    <option value="UPLOADED_FILE">קובץ</option>
                 </select>
              </div>
            </div>

            {showFilters && (
               <div className="grid md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-50 animate-fade-in items-end">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 mr-2">מינימום צפיות</label>
                    <input type="number" value={minViews} onChange={e => setMinViews(e.target.value)} placeholder="0" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 mr-2">מינימום לבבות</label>
                    <input type="number" value={minHearts} onChange={e => setMinHearts(e.target.value)} placeholder="0" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 mr-2">מינימום שימושים</label>
                    <input type="number" value={minUsage} onChange={e => setMinUsage(e.target.value)} placeholder="0" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold" />
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-0.5">
                    <input 
                        type="checkbox" 
                        id="show-upcoming-filter" 
                        checked={showUpcomingTests} 
                        onChange={e => setShowUpcomingTests(e.target.checked)} 
                        className="w-5 h-5 accent-primary cursor-pointer"
                    />
                    <label htmlFor="show-upcoming-filter" className="text-xs font-black text-gray-600 cursor-pointer">הצג התראות לפני מבחן</label>
                  </div>
               </div>
            )}
          </div>

          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
              <Search size={64} className="text-gray-100 mb-6" />
              <h3 className="text-2xl font-black text-gray-800">
                {libraryMode === 'MY_SAVED' ? 'אין סיכומים שמורים' : libraryMode === 'MY_UPLOADS' ? 'טרם העלית חומרים לספרייה' : 'לא נמצאו חומרים'}
              </h3>
              <p className="text-gray-400 font-bold">
                {libraryMode === 'MY_SAVED' 
                  ? 'סמן לייק (לב) על חומרים בספרייה כדי לשמור אותם כאן' 
                  : libraryMode === 'MY_UPLOADS'
                  ? 'חומרים שתפרסם לספריית הקהילה יופיעו כאן'
                  : 'נסו לשנות את מילות החיפוש או את המסננים'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredAndSortedItems.map(item => (
                <div key={item.id} className="group bg-white rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col overflow-hidden">
                   <div className="p-8 flex-1 cursor-pointer" onClick={() => handleOpenItem(item)}>
                      <div className="flex justify-between items-start mb-8">
                        <div className="bg-blue-50 p-4 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                           {getTypeIcon(item.type)}
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full">
                           <Eye size={12} className="text-gray-400" />
                           <span className="text-[10px] font-black text-gray-400">{item.views || 0}</span>
                        </div>
                      </div>
                      <h4 className="text-xl font-black text-gray-800 mb-2 line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-gray-400 font-bold uppercase mb-6">{item.subject} • {item.grade}</p>
                      
                      <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                         <div className="flex items-center gap-4">
                            <button 
                             onClick={(e) => { e.stopPropagation(); handleLike(item.id); }}
                             className={`flex items-center gap-1.5 transition-all ${user.likedMaterialIds?.includes(item.id) ? 'text-red-500 scale-110' : 'text-gray-300 hover:text-red-400'}`}
                            >
                               <Heart size={18} fill={user.likedMaterialIds?.includes(item.id) ? "currentColor" : "none"} />
                               <span className="text-xs font-black">{item.likes || 0}</span>
                            </button>
                            <div className="flex items-center gap-1.5 text-gray-300">
                               <Download size={18} />
                               <span className="text-xs font-black">{item.usages || 0}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            {libraryMode === 'MY_UPLOADS' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                className="p-2 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                title="הסר מהספרייה"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <div className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                               <span>צפה בתוכן</span>
                               <ArrowLeft size={16} />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showClassPublish && activeItem && (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up">
               <div className="p-8 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="text-2xl font-black text-gray-900">פרסום לכיתות שלי</h3>
                  <button onClick={() => setShowClassPublish(false)} className="text-gray-400 hover:text-gray-900 transition-all"><X size={24}/></button>
               </div>
               <div className="p-8 space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                  {userClassrooms.length === 0 ? (
                    <p className="text-center text-gray-400 font-bold py-10">לא נמצאו כיתות בניהולך.</p>
                  ) : (
                    userClassrooms.map(c => (
                        <button key={c.id} onClick={() => handlePublishToClasses([c.id])} className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-primary hover:bg-blue-50 transition-all text-right flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><School size={20}/></div>
                                <div>
                                    <h4 className="font-black text-gray-900">{c.name}</h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{c.subject} • {c.grade}</p>
                                </div>
                            </div>
                            <ChevronLeft size={20} className="text-gray-300" />
                        </button>
                    ))
                  )}
               </div>
               <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button onClick={() => setShowClassPublish(false)} className="text-gray-400 font-black hover:text-gray-900 px-6 py-2">סגור</button>
               </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LibraryView;